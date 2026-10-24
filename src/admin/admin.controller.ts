import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../common/request-context';
import { SessionGuard } from '../common/session.guard';
import { SetPlanDto, SuspendOrgDto } from './admin.dto';
import { AdminService } from './admin.service';
import { OperatorGuard } from './operator.guard';

// Operator console for the hosted service (portal page /admin).
@ApiExcludeController()
@UseGuards(SessionGuard, OperatorGuard)
@Controller('admin/orgs')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  list() {
    return this.admin.listOrgs();
  }

  @Post(':orgId/approve-live')
  @HttpCode(200)
  async approve(@Param('orgId', ParseUUIDPipe) orgId: string, @CurrentUser() user: User) {
    await this.admin.approveLive(orgId, user);
    return { ok: true };
  }

  @Post(':orgId/suspend')
  @HttpCode(200)
  async suspend(@Param('orgId', ParseUUIDPipe) orgId: string, @Body() dto: SuspendOrgDto, @CurrentUser() user: User) {
    await this.admin.suspend(orgId, dto.reason, user);
    return { ok: true };
  }

  @Post(':orgId/unsuspend')
  @HttpCode(200)
  async unsuspend(@Param('orgId', ParseUUIDPipe) orgId: string, @CurrentUser() user: User) {
    await this.admin.unsuspend(orgId, user);
    return { ok: true };
  }

  @Put(':orgId/plan')
  async setPlan(@Param('orgId', ParseUUIDPipe) orgId: string, @Body() dto: SetPlanDto, @CurrentUser() user: User) {
    await this.admin.setPlan(orgId, dto.plan, user);
    return { ok: true };
  }
}
