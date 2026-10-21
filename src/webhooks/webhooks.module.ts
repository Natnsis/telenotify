import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { WEBHOOKS_QUEUE } from './webhooks.constants';
import { WebhooksProcessor } from './webhooks.processor';
import { WebhooksService } from './webhooks.service';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: WEBHOOKS_QUEUE })],
  providers: [WebhooksService, WebhooksProcessor],
  exports: [WebhooksService],
})
export class WebhooksModule {}
