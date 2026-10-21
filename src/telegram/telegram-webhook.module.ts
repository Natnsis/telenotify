import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { MessagesModule } from '../messages/messages.module';
import { TelegramWebhookController } from './telegram-webhook.controller';
import { TelegramModule } from './telegram.module';

@Module({
  imports: [TelegramModule, CustomersModule, MessagesModule],
  controllers: [TelegramWebhookController],
})
export class TelegramWebhookModule {}
