import { Module } from '@nestjs/common';
import { PortalTemplatesController, TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';

@Module({
  controllers: [PortalTemplatesController, TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
