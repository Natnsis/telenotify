import { Processor, WorkerHost } from '@nestjs/bullmq';
import { DelayedError, Job } from 'bullmq';
import { BotRateLimiter } from './bot-rate-limiter.service';
import { DeliveryService } from './delivery.service';
import { DeliverJob, JOB_PRIORITY, MESSAGES_QUEUE } from './messages.constants';

// Rate limits are per bot (see BotRateLimiter), so one busy organization can't slow
// down the others. HIGH-priority jobs are picked before NORMAL ones.
@Processor(MESSAGES_QUEUE, { concurrency: 20 })
export class MessagesProcessor extends WorkerHost {
  constructor(
    private readonly delivery: DeliveryService,
    private readonly limiter: BotRateLimiter,
  ) {
    super();
  }

  async process(job: Job<DeliverJob>, token?: string): Promise<void> {
    if (job.data.botKey && !(await this.limiter.tryAcquire(job.data.botKey))) {
      // Over this bot's budget for the current second: come back when the next second
      // starts, without using an attempt. High-priority jobs return first, so they get
      // the new budget before normal ones.
      await job.moveToDelayed(nextWindowStart(job.opts.priority === JOB_PRIORITY.HIGH), token);
      throw new DelayedError();
    }
    const isFinalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
    await this.delivery.deliver(job.data.messageId, isFinalAttempt);
  }
}

export function nextWindowStart(high: boolean, now = Date.now()): number {
  const boundary = now - (now % 1000) + 1000;
  return high ? boundary + Math.floor(Math.random() * 20) : boundary + 100 + Math.floor(Math.random() * 200);
}
