import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../common/request-context';
import { SessionGuard } from '../common/session.guard';
import { AdminInsightsService } from './admin-insights.service';
import { OperatorGuard } from './operator.guard';

@ApiExcludeController()
@UseGuards(SessionGuard, OperatorGuard)
@Controller('admin')
export class AdminInsightsController {
  constructor(private readonly insights: AdminInsightsService) {}

  @Get('overview')
  overview() {
    return this.insights.overview();
  }

  @Get('system')
  system() {
    return this.insights.system();
  }

  @Get('users')
  users(@Query('q') q?: string) {
    return this.insights.listUsers(q);
  }

  @Post('users/:userId/verify-email')
  @HttpCode(200)
  async verifyEmail(@Param('userId', ParseUUIDPipe) userId: string, @CurrentUser() user: User) {
    await this.insights.verifyEmail(userId, user);
    return { ok: true };
  }

  @Post('users/:userId/sign-out')
  @HttpCode(200)
  signOut(@Param('userId', ParseUUIDPipe) userId: string, @CurrentUser() user: User) {
    return this.insights.signOutEverywhere(userId, user);
  }
}
