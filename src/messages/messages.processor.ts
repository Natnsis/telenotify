import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DeliveryService } from './delivery.service';
import { DeliverJob, MESSAGES_QUEUE } from './messages.constants';

// Telegram allows roughly 30 messages/second per bot. This global limit is
// conservative for a single bot; per-bot limiting is needed before many tenants share a worker.
@Processor(MESSAGES_QUEUE, { limiter: { max: 25, duration: 1000 }, concurrency: 10 })
export class MessagesProcessor extends WorkerHost {
  constructor(private readonly delivery: DeliveryService) {
    super();
  }

  async process(job: Job<DeliverJob>): Promise<void> {
    const isFinalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
    await this.delivery.deliver(job.data.messageId, isFinalAttempt);
  }
}
