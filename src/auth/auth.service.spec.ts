import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { hashPassword } from '../common/crypto';
import { AuthService } from './auth.service';

function setup(memberships: unknown[] = []) {
  const prisma: any = {
    membership: { findMany: jest.fn().mockResolvedValue(memberships) },
    organization: { delete: jest.fn() },
    user: { delete: jest.fn(), update: jest.fn() },
    session: { deleteMany: jest.fn() },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  const audit = { record: jest.fn() };
  const telegram = { clientForEnvironment: jest.fn() };
  const service = new AuthService(prisma, {} as any, {} as any, audit as any, telegram as any);
  return { service, prisma, audit };
}

const user = { id: 'u1', email: 'sami@example.com', passwordHash: null } as any;
const org = (name: string, members: { userId: string; role: string }[]) => ({ name, memberships: members, environments: [] });

describe('AuthService account deletion', () => {
  it('requires the exact email', async () => {
    const { service } = setup();
    await expect(service.deleteAccount(user, 'other@example.com')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks deletion when the user is the only owner of an org with other members', async () => {
    const { service, prisma } = setup([{ orgId: 'o1', role: 'OWNER', org: org('Mela', [{ userId: 'u1', role: 'OWNER' }, { userId: 'u2', role: 'MEMBER' }]) }]);
    await expect(service.deleteAccount(user, 'sami@example.com')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('deletes solo organizations and leaves shared ones', async () => {
    const { service, prisma, audit } = setup([
      { orgId: 'solo', role: 'OWNER', org: org('Solo', [{ userId: 'u1', role: 'OWNER' }]) },
      { orgId: 'shared', role: 'MEMBER', org: org('Shared', [{ userId: 'u1', role: 'MEMBER' }, { userId: 'u2', role: 'OWNER' }]) },
    ]);
    await service.deleteAccount(user, 'Sami@Example.com');
    expect(prisma.organization.delete).toHaveBeenCalledWith({ where: { id: 'solo' } });
    expect(audit.record).toHaveBeenCalledWith('shared', user, 'member.left', user.email, { reason: 'account deleted' });
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
  });
});

describe('AuthService password change', () => {
  it('requires the current password when one is set', async () => {
    const { service } = setup();
    const withPassword = { ...user, passwordHash: await hashPassword('old-password') };
    await expect(service.changePassword(withPassword, 'tok', 'wrong', 'new-password-1')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('lets Google-only accounts set a password and signs out other sessions', async () => {
    const { service, prisma } = setup();
    await service.changePassword(user, 'current-token', undefined, 'new-password-1');
    expect(prisma.session.deleteMany.mock.calls[0][0].where).toMatchObject({ userId: 'u1', NOT: { tokenHash: expect.any(String) } });
  });
});
