import { Body, Controller, Get, Param, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../common/api-key.guard';
import { RequestLogInterceptor } from '../request-log/request-log.interceptor';
import { CurrentEnvironment, EnvironmentWithOrg } from '../common/request-context';
import { CreateVerificationDto } from './verifications.dto';
import { VerificationsService } from './verifications.service';

@ApiTags('verifications')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@UseInterceptors(RequestLogInterceptor)
@Controller('v1/verifications')
export class VerificationsController {
  constructor(private readonly verifications: VerificationsService) {}

  @Post()
  @ApiOperation({
    summary: 'Verify a phone number with Telegram (no SMS)',
    description:
      'Returns a t.me link. The person opens it and shares their phone number with your bot; Telegram vouches it belongs to them. ' +
      'Poll GET /v1/verifications/:id or listen for verification.completed / verification.failed. ' +
      'With externalId, the person is also linked for Telegram notifications.',
  })
  create(@CurrentEnvironment() environment: EnvironmentWithOrg, @Body() dto: CreateVerificationDto) {
    return this.verifications.create(environment, dto);
  }

  @Get(':id')
  get(@CurrentEnvironment() environment: EnvironmentWithOrg, @Param('id') id: string) {
    return this.verifications.get(environment, id);
  }
}
