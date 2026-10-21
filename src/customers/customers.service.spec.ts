import { CustomersService } from './customers.service';

function setup(existing: { telegramChatId: string | null; blockedAt: Date | null }) {
  const link = { token: 't', environmentId: 'env-1', externalId: 'u1', environment: { type: 'LIVE' } };
  const prisma = {
    linkToken: { findFirst: jest.fn().mockResolvedValue(link), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    customer: {
      count: jest.fn(),
      findUnique: jest.fn().mockResolvedValue({ externalId: 'u1', ...existing }),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ externalId: 'u1', ...data, environment: link.environment })),
    },
  };
  const config = { get: (_k: string, fallback: unknown) => fallback };
  return new CustomersService(prisma as any, config as any, {} as any);
}

describe('CustomersService.linkByToken', () => {
  const chat = { chatId: '777', username: 'kebede' };

  it('links a new chat', async () => {
    const result = await setup({ telegramChatId: null, blockedAt: null }).linkByToken({ environmentId: 'env-1' }, 't', chat);
    expect(result).toMatchObject({ ok: true, alreadyLinked: false });
  });

  it('reports alreadyLinked when the same chat opens a second link', async () => {
    const result = await setup({ telegramChatId: '777', blockedAt: null }).linkByToken({ environmentId: 'env-1' }, 't', chat);
    expect(result).toMatchObject({ ok: true, alreadyLinked: true });
  });

  it('treats a previously blocked chat as a fresh link', async () => {
    const result = await setup({ telegramChatId: '777', blockedAt: new Date() }).linkByToken({ environmentId: 'env-1' }, 't', chat);
    expect(result).toMatchObject({ ok: true, alreadyLinked: false });
  });
});
