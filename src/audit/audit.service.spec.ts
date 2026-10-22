import { AuditService } from './audit.service';

describe('AuditService', () => {
  it('stores the actor email so entries survive user deletion', async () => {
    const prisma = { auditEvent: { create: jest.fn() } };
    await new AuditService(prisma as any).record('org-1', { id: 'u1', email: 'a@b.c' }, 'api_key.created', 'Prod', { environment: 'live' });
    expect(prisma.auditEvent.create.mock.calls[0][0].data).toMatchObject({ orgId: 'org-1', actorUserId: 'u1', actorEmail: 'a@b.c', action: 'api_key.created', target: 'Prod' });
  });

  it('never throws when the audit write fails', async () => {
    const prisma = { auditEvent: { create: jest.fn().mockRejectedValue(new Error('db down')) } };
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(new AuditService(prisma as any).record('org-1', null, 'plan.changed', 'STARTER')).resolves.toBeUndefined();
  });
});
