import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { TelegramModule } from '../telegram/telegram.module';
import { TemplatesModule } from '../templates/templates.module';
import { BotRateLimiter } from './bot-rate-limiter.service';
import { DeliveryService } from './delivery.service';
import { MESSAGES_QUEUE } from './messages.constants';
import { MessagesController } from './messages.controller';
import { MessagesProcessor } from './messages.processor';
import { MessagesService } from './messages.service';

@Module({
  imports: [
    TelegramModule,
    CustomersModule,
    TemplatesModule,
    BullModule.registerQueue({
      name: MESSAGES_QUEUE,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    }),
  ],
  controllers: [MessagesController],
  providers: [MessagesService, DeliveryService, MessagesProcessor, BotRateLimiter],
  exports: [MessagesService],
})
export class MessagesModule {}
