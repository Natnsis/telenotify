import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AUTH_LIMITS } from '../common/throttling';
import { PublicVerificationDto } from './verifications.dto';
import { VerificationsService } from './verifications.service';

// Used by the hosted verify page (through the portal's /api proxy), so no API key and
// no CORS: the embeddable button opens that page instead of calling this directly.
@ApiExcludeController()
@UseGuards(ThrottlerGuard)
@Controller('v1/public/verifications')
export class PublicVerificationsController {
  constructor(private readonly verifications: VerificationsService) {}

  @Post()
  @Throttle(AUTH_LIMITS.publicVerification)
  create(@Body() dto: PublicVerificationDto) {
    return this.verifications.createPublic(dto);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.verifications.getPublic(id);
  }
}
