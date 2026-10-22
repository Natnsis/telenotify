import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { WEBHOOKS_QUEUE, WebhookJob } from './webhooks.constants';
import { WebhooksService } from './webhooks.service';

@Processor(WEBHOOKS_QUEUE, { concurrency: 20 })
export class WebhooksProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhooksProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhooks: WebhooksService,
  ) {
    super();
  }

  async process(job: Job<WebhookJob>): Promise<void> {
    // Read the current URL and secret, so edits and rotations apply to pending retries.
    const environment = await this.prisma.environment.findUnique({ where: { id: job.data.environmentId } });
    const final = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
    if (!environment?.eventWebhookUrl) {
      await this.webhooks.recordAttempt(job.data.payload.id, { delivered: false, error: 'Webhook URL was removed' }, true);
      return;
    }
    const result = await this.webhooks.deliver(environment, job.data.payload);
    await this.webhooks.recordAttempt(job.data.payload.id, result, final);
    if (!result.delivered) {
      if (final) this.logger.warn(`Giving up on event ${job.data.payload.id} after ${job.attemptsMade + 1} attempts`);
      throw new Error(result.statusCode ? `HTTP ${result.statusCode}` : (result.error ?? 'delivery failed'));
    }
  }
}
