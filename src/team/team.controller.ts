import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Role, User } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import type { Request } from 'express';
import { OrgAccessGuard } from '../common/org-access.guard';
import { CurrentUser } from '../common/request-context';
import { SessionGuard } from '../common/session.guard';
import { MembershipWithOrg, TeamService } from './team.service';

class InviteDto {
  @IsEmail()
  email!: string;

  @IsEnum(Role)
  role!: Role;
}

class AcceptDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}

class RenameOrgDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;
}

class DeleteOrgDto {
  @IsString()
  confirmName!: string;
}

type OrgRequest = Request & { membership: MembershipWithOrg };

@ApiExcludeController()
@UseGuards(SessionGuard, OrgAccessGuard)
@Controller('portal/orgs/:orgId')
export class OrgSettingsController {
  constructor(private readonly team: TeamService) {}

  @Patch()
  rename(@Req() req: OrgRequest, @CurrentUser() user: User, @Body() dto: RenameOrgDto) {
    return this.team.renameOrg(req.membership, user, dto.name);
  }

  @Post('leave')
  @HttpCode(204)
  leave(@Req() req: OrgRequest, @CurrentUser() user: User) {
    return this.team.leaveOrg(req.membership, user);
  }

  @Delete()
  @HttpCode(204)
  remove(@Req() req: OrgRequest, @Body() dto: DeleteOrgDto) {
    return this.team.deleteOrg(req.membership, dto.confirmName);
  }
}

@ApiExcludeController()
@UseGuards(SessionGuard, OrgAccessGuard)
@Controller('portal/orgs/:orgId/team')
export class TeamController {
  constructor(private readonly team: TeamService) {}

  @Get()
  overview(@Req() req: OrgRequest) {
    return this.team.overview(req.membership.org);
  }

  @Post('invitations')
  invite(@Req() req: OrgRequest, @CurrentUser() user: User, @Body() dto: InviteDto) {
    return this.team.invite(req.membership, user, dto.email, dto.role);
  }

  @Delete('invitations/:invitationId')
  @HttpCode(204)
  revoke(@Req() req: OrgRequest, @CurrentUser() user: User, @Param('invitationId') invitationId: string) {
    return this.team.revokeInvitation(req.membership, user, invitationId);
  }

  @Delete('members/:userId')
  @HttpCode(204)
  remove(@Req() req: OrgRequest, @CurrentUser() user: User, @Param('userId') userId: string) {
    return this.team.removeMember(req.membership, user, userId);
  }
}

@ApiExcludeController()
@Controller()
export class InvitationsController {
  constructor(private readonly team: TeamService) {}

  // Public: lets the invite page show who invited whom before sign-in.
  @Get('auth/invitations/:token')
  @UseGuards(ThrottlerGuard)
  @Throttle({ ip: { limit: 20, ttl: 60_000 } })
  preview(@Param('token') token: string) {
    return this.team.preview(token);
  }

  @Post('portal/invitations/accept')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  accept(@CurrentUser() user: User, @Body() dto: AcceptDto) {
    return this.team.accept(user, dto.token);
  }
}
