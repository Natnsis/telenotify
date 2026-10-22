import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { SMS_FALLBACK_QUEUE } from './sms-fallback.constants';
import { SmsFallbackProcessor } from './sms-fallback.processor';
import { SmsFallbackService } from './sms-fallback.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: SMS_FALLBACK_QUEUE,
      defaultJobOptions: {
        attempts: 4,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    }),
  ],
  providers: [SmsFallbackService, SmsFallbackProcessor],
  exports: [SmsFallbackService],
})
export class SmsFallbackModule {}
