import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InvitationsController, OrgSettingsController, TeamController } from './team.controller';
import { TeamService } from './team.service';

@Module({
  imports: [AuthModule],
  controllers: [TeamController, InvitationsController, OrgSettingsController],
  providers: [TeamService],
})
export class TeamModule {}
