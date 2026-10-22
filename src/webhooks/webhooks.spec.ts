import { NotFoundException } from '@nestjs/common';
import { WEBHOOK_ATTEMPTS } from './webhooks.constants';
import { WebhooksProcessor } from './webhooks.processor';
import { WebhooksService } from './webhooks.service';

const environment = (overrides: object = {}) =>
  ({ id: 'env-1', type: 'SANDBOX', eventWebhookUrl: 'https://hooks.example.com/t', eventSigningSecret: 'whsec_x', ...overrides }) as any;

function service(allowPrivate = false) {
  const queue = { add: jest.fn() };
  const config = { get: (key: string) => (key === 'ALLOW_PRIVATE_WEBHOOK_URLS' ? String(allowPrivate) : undefined) };
  const prisma = {
    webhookDelivery: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'evt', ...data })),
    },
  };
  return { webhooks: new WebhooksService(queue as any, config as any, prisma as any), queue, prisma };
}

describe('WebhooksService', () => {
  it('logs the event, then queues it with retries under the same id', async () => {
    const { webhooks, queue, prisma } = service();
    await webhooks.emit(environment(), 'message.sent', { id: 'm1' });
    const logged = prisma.webhookDelivery.create.mock.calls[0][0].data;
    expect(logged).toMatchObject({ environmentId: 'env-1', event: 'message.sent', messageId: 'm1' });
    const [, job, opts] = queue.add.mock.calls[0];
    expect(job.payload.id).toBe(logged.id);
    expect(opts).toMatchObject({ jobId: logged.id, attempts: WEBHOOK_ATTEMPTS });
  });

  it('does nothing when no webhook URL is set', async () => {
    const { webhooks, queue, prisma } = service();
    await webhooks.emit(environment({ eventWebhookUrl: null }), 'message.sent', {});
    expect(queue.add).not.toHaveBeenCalled();
    expect(prisma.webhookDelivery.create).not.toHaveBeenCalled();
  });

  it.each(['http://127.0.0.1:3000/hook', 'http://localhost/hook', 'http://169.254.169.254/latest'])('refuses to deliver to %s', async (url) => {
    const { webhooks } = service();
    const env = environment({ eventWebhookUrl: url });
    const result = await webhooks.deliver(env, webhooks.buildPayload(env, 'webhook.test', {}));
    expect(result).toMatchObject({ delivered: false, error: expect.stringMatching(/private or reserved/) });
  });

  it.each([
    [{ delivered: true, statusCode: 200 }, false, 'DELIVERED'],
    [{ delivered: false, statusCode: 503 }, false, 'PENDING'],
    [{ delivered: false, statusCode: 503 }, true, 'FAILED'],
  ])('records attempt %j (final=%s) as %s', async (result, final, status) => {
    const { webhooks, prisma } = service();
    prisma.webhookDelivery.findUnique.mockResolvedValue({ id: 'evt', attemptLog: [], deliveredAt: null });
    await webhooks.recordAttempt('evt', result, final);
    const data = prisma.webhookDelivery.update.mock.calls[0][0].data;
    expect(data.status).toBe(status);
    expect(data.attemptLog).toHaveLength(1);
    expect(data.lastStatusCode).toBe(result.statusCode);
  });

  it('resends a logged event with its original payload', async () => {
    const { webhooks, prisma, queue } = service();
    prisma.webhookDelivery.findFirst.mockResolvedValue({ id: 'evt', payload: { id: 'evt', event: 'message.sent' } });
    await webhooks.resend(environment(), 'evt');
    expect(prisma.webhookDelivery.update.mock.calls[0][0].data).toEqual({ status: 'PENDING' });
    expect(queue.add.mock.calls[0][1].payload.id).toBe('evt');
    expect(queue.add.mock.calls[0][2].jobId).toMatch(/^evt:resend:/);
  });

  it('cannot resend events from another environment', async () => {
    const { webhooks, prisma } = service();
    prisma.webhookDelivery.findFirst.mockResolvedValue(null);
    await expect(webhooks.resend(environment(), 'evt')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('WebhooksProcessor', () => {
  const job = (attemptsMade = 0) => ({ data: { environmentId: 'env-1', payload: { id: 'evt' } }, attemptsMade, opts: { attempts: 10 } }) as any;
  const setup = (env: object | null, result?: object) => {
    const prisma = { environment: { findUnique: jest.fn().mockResolvedValue(env) } };
    const webhooks = { deliver: jest.fn().mockResolvedValue(result), recordAttempt: jest.fn() };
    return { processor: new WebhooksProcessor(prisma as any, webhooks as any), webhooks };
  };

  it('records the attempt and throws on failure so BullMQ retries', async () => {
    const { processor, webhooks } = setup(environment(), { delivered: false, statusCode: 503 });
    await expect(processor.process(job())).rejects.toThrow('HTTP 503');
    expect(webhooks.recordAttempt).toHaveBeenCalledWith('evt', { delivered: false, statusCode: 503 }, false);
  });

  it('marks the final attempt as final', async () => {
    const { processor, webhooks } = setup(environment(), { delivered: false, statusCode: 500 });
    await expect(processor.process(job(9))).rejects.toThrow();
    expect(webhooks.recordAttempt.mock.calls[0][2]).toBe(true);
  });

  it('completes on success', async () => {
    const { processor } = setup(environment(), { delivered: true, statusCode: 200 });
    await expect(processor.process(job())).resolves.toBeUndefined();
  });

  it('fails the event without delivering if the webhook URL was removed', async () => {
    const { processor, webhooks } = setup(environment({ eventWebhookUrl: null }));
    await processor.process(job());
    expect(webhooks.deliver).not.toHaveBeenCalled();
    expect(webhooks.recordAttempt).toHaveBeenCalledWith('evt', expect.objectContaining({ delivered: false }), true);
  });
});
