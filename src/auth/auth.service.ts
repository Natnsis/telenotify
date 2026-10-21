import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User, UserTokenType } from '@prisma/client';
import { hashPassword, randomToken, sha256, verifyPassword } from '../common/crypto';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';

const SESSION_DAYS = 30;
const VERIFY_HOURS = 48;
const RESET_HOURS = 1;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async signup(name: string, email: string, password: string): Promise<User> {
    const normalized = email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (existing) {
      throw new ConflictException(
        existing.passwordHash ? 'An account with this email already exists' : 'This email signs in with Google',
      );
    }
    const user = await this.prisma.user.create({
      data: { name: name.trim(), email: normalized, passwordHash: await hashPassword(password) },
    });
    await this.sendVerification(user);
    return user;
  }

  async login(email: string, password: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    // Same error for unknown email and wrong password.
    if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException('Incorrect email or password');
    }
    return user;
  }

  async createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const token = randomToken(32);
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
    await this.prisma.session.create({ data: { tokenHash: sha256(token), userId, expiresAt } });
    return { token, expiresAt };
  }

  async destroySession(token: string | undefined): Promise<void> {
    if (token) await this.prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  }

  async sendVerification(user: User): Promise<void> {
    if (user.emailVerifiedAt) return;
    const token = await this.issueToken(user.id, 'EMAIL_VERIFY', VERIFY_HOURS);
    await this.mail.send(
      user.email,
      'Verify your Telenotify email',
      `Hi ${user.name},\n\nConfirm your email to start using Telenotify:\n${this.portalUrl()}/verify-email?token=${token}\n\nThis link expires in ${VERIFY_HOURS} hours.`,
    );
  }

  async verifyEmail(token: string): Promise<User> {
    const userId = await this.consumeToken(token, 'EMAIL_VERIFY');
    return this.prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  }

  // Always succeeds, so the endpoint does not reveal which emails have accounts.
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user) return;
    const token = await this.issueToken(user.id, 'PASSWORD_RESET', RESET_HOURS);
    await this.mail.send(
      user.email,
      'Reset your Telenotify password',
      `Hi ${user.name},\n\nReset your password here:\n${this.portalUrl()}/reset-password?token=${token}\n\nThis link expires in ${RESET_HOURS} hour. If you didn't ask for this, ignore this email.`,
    );
  }

  async resetPassword(token: string, password: string): Promise<User> {
    const userId = await this.consumeToken(token, 'PASSWORD_RESET');
    // Clicking the emailed link proves the email, and all old sessions are signed out.
    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: await hashPassword(password), emailVerifiedAt: new Date() },
      }),
      this.prisma.session.deleteMany({ where: { userId } }),
    ]);
    return user;
  }

  // Google sign-in: match by Google account, then by verified email, else create.
  async findOrCreateGoogleUser(profile: { sub: string; email: string; name: string }): Promise<User> {
    const email = profile.email.toLowerCase();
    const bySub = await this.prisma.user.findUnique({ where: { googleSub: profile.sub } });
    if (bySub) return bySub;
    const byEmail = await this.prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      return this.prisma.user.update({
        where: { id: byEmail.id },
        data: { googleSub: profile.sub, emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date() },
      });
    }
    return this.prisma.user.create({
      data: { email, name: profile.name || email.split('@')[0], googleSub: profile.sub, emailVerifiedAt: new Date() },
    });
  }

  toView(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: Boolean(user.emailVerifiedAt),
      hasPassword: Boolean(user.passwordHash),
      googleLinked: Boolean(user.googleSub),
    };
  }

  portalUrl(): string {
    return this.config.getOrThrow<string>('PORTAL_URL').replace(/\/$/, '');
  }

  private async issueToken(userId: string, type: UserTokenType, hours: number): Promise<string> {
    const token = randomToken(32);
    // Only the newest link of each type works.
    await this.prisma.userToken.deleteMany({ where: { userId, type, usedAt: null } });
    await this.prisma.userToken.create({
      data: { tokenHash: sha256(token), userId, type, expiresAt: new Date(Date.now() + hours * 3_600_000) },
    });
    return token;
  }

  private async consumeToken(token: string, type: UserTokenType): Promise<string> {
    const tokenHash = sha256(token);
    const claimed = await this.prisma.userToken.updateMany({
      where: { tokenHash, type, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claimed.count === 0) throw new BadRequestException('This link is invalid or has expired');
    const { userId } = await this.prisma.userToken.findUniqueOrThrow({ where: { tokenHash } });
    return userId;
  }
}
