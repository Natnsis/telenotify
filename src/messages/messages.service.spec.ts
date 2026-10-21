import { BadRequestException, HttpException } from '@nestjs/common';
import { MessagesService } from './messages.service';

function setup(customer: object, environment: object = { id: 'env-1', type: 'LIVE' }, opts: { hasBot?: boolean; sentToday?: number } = {}) {
  const prisma = {
    message: {
      findUnique: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(opts.sentToday ?? 0),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'msg-1', ...data, customer, attempts: 0, createdAt: new Date() })),
    },
  };
  const customers = { upsert: jest.fn().mockResolvedValue(customer) };
  const telegram = { hasBot: jest.fn().mockReturnValue(opts.hasBot ?? true) };
  const webhooks = { emit: jest.fn() };
  const config = { get: (_key: string, fallback: unknown) => fallback };
  const queue = { add: jest.fn() };
  const service = new MessagesService(prisma as any, customers as any, telegram as any, webhooks as any, config as any, queue as any);
  return { service, queue, webhooks, environment: environment as any };
}

const linked = { id: 'c1', externalId: 'u1', telegramChatId: '111', blockedAt: null };

describe('MessagesService.send', () => {
  it('queues a message for a reachable customer', async () => {
    const { service, queue, environment } = setup(linked);
    const result = await service.send(environment, { to: 'u1', text: 'hi' });
    expect(result).toMatchObject({ status: 'QUEUED', reason: null });
    expect(queue.add).toHaveBeenCalledWith('deliver', { messageId: 'msg-1' }, { jobId: 'msg-1' });
  });

  it.each([
    [{ ...linked, telegramChatId: null }, 'not_linked'],
    [{ ...linked, blockedAt: new Date() }, 'blocked'],
  ])('returns UNDELIVERABLE immediately (%#)', async (customer, reason) => {
    const { service, queue, webhooks, environment } = setup(customer);
    const result = await service.send(environment, { to: 'u1', text: 'hi' });
    expect(result).toMatchObject({ status: 'UNDELIVERABLE', reason });
    expect(queue.add).not.toHaveBeenCalled();
    expect(webhooks.emit).toHaveBeenCalledWith(environment, 'message.undeliverable', expect.objectContaining({ reason }));
  });

  it('rejects live sends when no bot is connected', async () => {
    const { service, environment } = setup(linked, undefined, { hasBot: false });
    await expect(service.send(environment, { to: 'u1', text: 'hi' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('enforces the sandbox daily limit', async () => {
    const { service, environment } = setup(linked, { id: 'env-1', type: 'SANDBOX' }, { sentToday: 100 });
    await expect(service.send(environment, { to: 'u1', text: 'hi' })).rejects.toBeInstanceOf(HttpException);
  });
});
