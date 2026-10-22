import { Body, Controller, Delete, Get, HttpCode, Logger, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { User } from '@prisma/client';
import type { CookieOptions, Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { randomToken, safeEqual } from '../common/crypto';
import { CurrentUser } from '../common/request-context';
import { AUTH_LIMITS } from '../common/throttling';
import { AllowUnverified, SESSION_COOKIE, SessionGuard } from '../common/session.guard';
import { ChangePasswordDto, DeleteAccountDto, EmailDto, LoginDto, ResetPasswordDto, SignupDto, TokenDto, UpdateProfileDto } from './auth.dto';
import { AuthService } from './auth.service';
import { GoogleService } from './google.service';

const OAUTH_STATE_COOKIE = 'tn_oauth_state';

@ApiExcludeController()
@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly auth: AuthService,
    private readonly google: GoogleService,
    private readonly config: ConfigService,
  ) {}

  @Get('config')
  authConfig() {
    return { googleEnabled: this.google.enabled };
  }

  @Post('signup')
  @Throttle(AUTH_LIMITS.signup)
  async signup(@Body() dto: SignupDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.signup(dto.name, dto.email, dto.password);
    await this.startSession(res, user.id);
    return this.auth.toView(user);
  }

  @Post('login')
  @Throttle(AUTH_LIMITS.login)
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.login(dto.email, dto.password);
    await this.startSession(res, user.id);
    return this.auth.toView(user);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.destroySession(req.cookies?.[SESSION_COOKIE]);
    res.clearCookie(SESSION_COOKIE, this.cookieOptions());
  }

  @Get('me')
  @AllowUnverified()
  @UseGuards(SessionGuard)
  me(@CurrentUser() user: User) {
    return this.auth.toView(user);
  }

  @Patch('me')
  @UseGuards(SessionGuard)
  async updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.auth.toView(await this.auth.updateProfile(user, dto.name));
  }

  @Post('change-password')
  @HttpCode(204)
  @Throttle(AUTH_LIMITS.login)
  @UseGuards(SessionGuard)
  async changePassword(@CurrentUser() user: User, @Req() req: Request, @Body() dto: ChangePasswordDto) {
    await this.auth.changePassword(user, req.cookies?.[SESSION_COOKIE], dto.currentPassword, dto.newPassword);
  }

  @Delete('me')
  @HttpCode(204)
  @AllowUnverified()
  @UseGuards(SessionGuard)
  async deleteAccount(@CurrentUser() user: User, @Body() dto: DeleteAccountDto, @Res({ passthrough: true }) res: Response) {
    await this.auth.deleteAccount(user, dto.confirmEmail);
    res.clearCookie(SESSION_COOKIE, this.cookieOptions());
  }

  @Post('resend-verification')
  @Throttle(AUTH_LIMITS.resendVerification)
  @HttpCode(204)
  @AllowUnverified()
  @UseGuards(SessionGuard)
  async resendVerification(@CurrentUser() user: User) {
    await this.auth.sendVerification(user);
  }

  @Post('verify-email')
  @Throttle(AUTH_LIMITS.tokenRedeem)
  @HttpCode(200)
  async verifyEmail(@Body() dto: TokenDto) {
    return this.auth.toView(await this.auth.verifyEmail(dto.token));
  }

  @Post('forgot-password')
  @Throttle(AUTH_LIMITS.forgotPassword)
  @HttpCode(204)
  async forgotPassword(@Body() dto: EmailDto) {
    await this.auth.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @Throttle(AUTH_LIMITS.tokenRedeem)
  @HttpCode(200)
  async resetPassword(@Body() dto: ResetPasswordDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.resetPassword(dto.token, dto.password);
    await this.startSession(res, user.id);
    return this.auth.toView(user);
  }

  @Get('google')
  @Throttle(AUTH_LIMITS.google)
  googleStart(@Res() res: Response) {
    if (!this.google.enabled) return res.redirect(`${this.auth.portalUrl()}/login?error=google_not_configured`);
    const state = randomToken(24);
    res.cookie(OAUTH_STATE_COOKIE, state, { ...this.cookieOptions(), maxAge: 10 * 60_000 });
    return res.redirect(this.google.authorizationUrl(state));
  }

  @Get('google/callback')
  @Throttle(AUTH_LIMITS.google)
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const expectedState = req.cookies?.[OAUTH_STATE_COOKIE];
    res.clearCookie(OAUTH_STATE_COOKIE, this.cookieOptions());
    const portal = this.auth.portalUrl();
    if (!code || !state || typeof expectedState !== 'string' || !safeEqual(state, expectedState)) {
      return res.redirect(`${portal}/login?error=google_failed`);
    }
    try {
      const profile = await this.google.exchangeCode(code);
      const user = await this.auth.findOrCreateGoogleUser(profile);
      await this.startSession(res, user.id);
      return res.redirect(`${portal}/dashboard`);
    } catch (error) {
      this.logger.warn(`Google sign-in failed: ${(error as Error).message}`);
      return res.redirect(`${portal}/login?error=google_failed`);
    }
  }

  private async startSession(res: Response, userId: string) {
    const { token, expiresAt } = await this.auth.createSession(userId);
    res.cookie(SESSION_COOKIE, token, { ...this.cookieOptions(), expires: expiresAt });
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('COOKIE_SECURE') === 'true',
      path: '/',
    };
  }
}
