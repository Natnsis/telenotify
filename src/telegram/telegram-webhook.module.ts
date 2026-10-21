import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { MessagesModule } from '../messages/messages.module';
import { VerificationsModule } from '../verifications/verifications.module';
import { LiveBotWebhooksService } from './live-bot-webhooks.service';
import { TelegramWebhookController } from './telegram-webhook.controller';
import { TelegramModule } from './telegram.module';

@Module({
  imports: [TelegramModule, CustomersModule, MessagesModule, VerificationsModule],
  controllers: [TelegramWebhookController],
  providers: [LiveBotWebhooksService],
})
export class TelegramWebhookModule {}
