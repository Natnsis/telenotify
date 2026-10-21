import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Environment } from '@prisma/client';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { fetch } from 'undici';
import { hmacSha256 } from '../common/crypto';
import { assertPublicUrl, BlockedAddressError, publicOnlyAgent } from '../common/network-guard';
import { EventPayload, WEBHOOK_ATTEMPTS, WEBHOOK_BACKOFF_MS, WEBHOOKS_QUEUE, WebhookJob } from './webhooks.constants';

export type EnvironmentEvent =
  | 'message.sent'
  | 'message.undeliverable'
  | 'message.failed'
  | 'message.received'
  | 'customer.linked'
  | 'customer.blocked'
  | 'verification.completed'
  | 'verification.failed'
  | 'webhook.test';

export interface DeliveryResult {
  delivered: boolean;
  statusCode?: number;
  error?: string;
}

// Events are queued and delivered with retries, signed at send time:
//   x-telenotify-signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<body>">
//   x-telenotify-event-id:  stable across retries, for de-duplication
@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectQueue(WEBHOOKS_QUEUE) private readonly queue: Queue<WebhookJob>,
    private readonly config: ConfigService,
  ) {}

  async emit(environment: Environment, event: EnvironmentEvent, data: Record<string, unknown>): Promise<void> {
    if (!environment.eventWebhookUrl) return;
    const payload = this.buildPayload(environment, event, data);
    await this.queue.add('deliver', { environmentId: environment.id, payload }, {
      jobId: payload.id,
      attempts: WEBHOOK_ATTEMPTS,
      backoff: { type: 'exponential', delay: WEBHOOK_BACKOFF_MS },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }

  buildPayload(environment: Environment, event: EnvironmentEvent, data: Record<string, unknown>): EventPayload {
    return { id: randomUUID(), event, environment: environment.type.toLowerCase(), createdAt: new Date().toISOString(), data };
  }

  // One delivery attempt. Never throws; the caller decides whether to retry.
  async deliver(environment: Environment, payload: EventPayload): Promise<DeliveryResult> {
    if (!environment.eventWebhookUrl) return { delivered: false, error: 'No webhook URL configured' };
    const body = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = hmacSha256(environment.eventSigningSecret, `${timestamp}.${body}`);
    try {
      const url = new URL(environment.eventWebhookUrl);
      const guard = !this.allowPrivate();
      if (guard) await assertPublicUrl(url);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'Telenotify-Webhooks/1.0',
          'x-telenotify-signature': `t=${timestamp},v1=${signature}`,
          'x-telenotify-event-id': payload.id,
        },
        body,
        redirect: 'manual',
        signal: AbortSignal.timeout(5_000),
        ...(guard ? { dispatcher: publicOnlyAgent } : {}),
      });
      await response.body?.cancel(); // we never read the response
      return { delivered: response.ok, statusCode: response.status };
    } catch (error) {
      const message = error instanceof BlockedAddressError ? error.message : this.describe(error);
      this.logger.warn(`Event ${payload.event} (${payload.id}) to environment ${environment.id} failed: ${message}`);
      return { delivered: false, error: message };
    }
  }

  // Local development only: lets webhooks reach servers on localhost.
  private allowPrivate(): boolean {
    return this.config.get('ALLOW_PRIVATE_WEBHOOK_URLS') === 'true';
  }

  private describe(error: unknown): string {
    const cause = (error as { cause?: Error }).cause;
    if (cause instanceof BlockedAddressError) return cause.message;
    return cause?.message ?? (error as Error).message;
  }
}
