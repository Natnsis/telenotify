import { WEBHOOK_ATTEMPTS } from './webhooks.constants';
import { WebhooksProcessor } from './webhooks.processor';
import { WebhooksService } from './webhooks.service';

const environment = (overrides: object = {}) =>
  ({ id: 'env-1', type: 'SANDBOX', eventWebhookUrl: 'https://hooks.example.com/t', eventSigningSecret: 'whsec_x', ...overrides }) as any;

function service(allowPrivate = false) {
  const queue = { add: jest.fn() };
  const config = { get: (key: string) => (key === 'ALLOW_PRIVATE_WEBHOOK_URLS' ? String(allowPrivate) : undefined) };
  return { webhooks: new WebhooksService(queue as any, config as any), queue };
}

describe('WebhooksService', () => {
  it('queues events with retries and a stable event id', async () => {
    const { webhooks, queue } = service();
    await webhooks.emit(environment(), 'message.sent', { id: 'm1' });
    const [, job, opts] = queue.add.mock.calls[0];
    expect(job).toMatchObject({ environmentId: 'env-1', payload: { event: 'message.sent', environment: 'sandbox', data: { id: 'm1' } } });
    expect(opts).toMatchObject({ jobId: job.payload.id, attempts: WEBHOOK_ATTEMPTS });
  });

  it('does nothing when no webhook URL is set', async () => {
    const { webhooks, queue } = service();
    await webhooks.emit(environment({ eventWebhookUrl: null }), 'message.sent', {});
    expect(queue.add).not.toHaveBeenCalled();
  });

  it.each(['http://127.0.0.1:3000/hook', 'http://localhost/hook', 'http://169.254.169.254/latest'])('refuses to deliver to %s', async (url) => {
    const { webhooks } = service();
    const env = environment({ eventWebhookUrl: url });
    const result = await webhooks.deliver(env, webhooks.buildPayload(env, 'webhook.test', {}));
    expect(result).toMatchObject({ delivered: false, error: expect.stringMatching(/private or reserved/) });
  });
});

describe('WebhooksProcessor', () => {
  const job = (attemptsMade = 0) => ({ data: { environmentId: 'env-1', payload: { id: 'evt' } }, attemptsMade, opts: { attempts: 10 } }) as any;

  it('throws on failed delivery so BullMQ retries', async () => {
    const prisma = { environment: { findUnique: jest.fn().mockResolvedValue(environment()) } };
    const webhooks = { deliver: jest.fn().mockResolvedValue({ delivered: false, statusCode: 503 }) };
    await expect(new WebhooksProcessor(prisma as any, webhooks as any).process(job())).rejects.toThrow('HTTP 503');
  });

  it('completes on success', async () => {
    const prisma = { environment: { findUnique: jest.fn().mockResolvedValue(environment()) } };
    const webhooks = { deliver: jest.fn().mockResolvedValue({ delivered: true, statusCode: 200 }) };
    await expect(new WebhooksProcessor(prisma as any, webhooks as any).process(job())).resolves.toBeUndefined();
  });

  it('drops the event if the webhook URL was removed', async () => {
    const prisma = { environment: { findUnique: jest.fn().mockResolvedValue(environment({ eventWebhookUrl: null })) } };
    const webhooks = { deliver: jest.fn() };
    await new WebhooksProcessor(prisma as any, webhooks as any).process(job());
    expect(webhooks.deliver).not.toHaveBeenCalled();
  });
});
