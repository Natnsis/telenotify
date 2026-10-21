export const WEBHOOKS_QUEUE = 'webhook-events';

export interface EventPayload {
  id: string;
  event: string;
  environment: string;
  createdAt: string;
  data: Record<string, unknown>;
}

export interface WebhookJob {
  environmentId: string;
  payload: EventPayload;
}

// 10 attempts, exponential from 5s: retries over roughly 40 minutes.
export const WEBHOOK_ATTEMPTS = 10;
export const WEBHOOK_BACKOFF_MS = 5_000;
