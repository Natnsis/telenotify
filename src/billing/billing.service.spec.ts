import { HttpException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { currentPeriod } from './plans';

function setup(plan: string, messages: number, verifications: number) {
  const prisma = {
    environment: { findUnique: jest.fn().mockResolvedValue({ id: 'live-1' }) },
    message: { count: jest.fn().mockResolvedValue(messages) },
    verification: { count: jest.fn().mockResolvedValue(verifications) },
    organization: { findUniqueOrThrow: jest.fn() },
  };
  return { billing: new BillingService(prisma as any), prisma, env: { id: 'live-1', type: 'LIVE', orgId: 'org-1', org: { id: 'org-1', plan } } as any };
}

describe('BillingService', () => {
  it('allows live sends under the quota', async () => {
    const { billing, env } = setup('FREE', 600, 399);
    await expect(billing.assertWithinQuota(env)).resolves.toBeUndefined();
  });

  it('blocks live sends once messages + verifications reach the quota', async () => {
    const { billing, env } = setup('FREE', 600, 400);
    await expect(billing.assertWithinQuota(env)).rejects.toBeInstanceOf(HttpException);
  });

  it('never limits the Business plan or the sandbox', async () => {
    const business = setup('BUSINESS', 10_000_000, 0);
    await expect(business.billing.assertWithinQuota(business.env)).resolves.toBeUndefined();
    const sandbox = setup('FREE', 5_000, 0);
    await expect(sandbox.billing.assertWithinQuota({ ...sandbox.env, type: 'SANDBOX' })).resolves.toBeUndefined();
    expect(sandbox.prisma.message.count).not.toHaveBeenCalled();
  });

  it('counts only delivered or in-flight messages and completed verifications', async () => {
    const { billing, prisma } = setup('FREE', 1, 1);
    await billing.usage('org-1');
    expect(prisma.message.count.mock.calls[0][0].where.status).toEqual({ in: ['QUEUED', 'SENT'] });
    expect(prisma.verification.count.mock.calls[0][0].where.status).toBe('VERIFIED');
  });

  it('uses calendar months in UTC', () => {
    const { start, end } = currentPeriod(new Date('2026-10-21T23:30:00Z'));
    expect(start.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });
});
