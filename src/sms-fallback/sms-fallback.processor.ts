import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { FallbackJob, SMS_FALLBACK_QUEUE } from './sms-fallback.constants';
import { SmsFallbackService } from './sms-fallback.service';

@Processor(SMS_FALLBACK_QUEUE, { concurrency: 10 })
export class SmsFallbackProcessor extends WorkerHost {
  constructor(private readonly fallback: SmsFallbackService) {
    super();
  }

  async process(job: Job<FallbackJob>): Promise<void> {
    const isFinalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
    await this.fallback.deliver(job.data.messageId, isFinalAttempt);
  }
}
