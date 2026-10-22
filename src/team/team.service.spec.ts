import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { sha256 } from '../common/crypto';
import { TeamService } from './team.service';

const owner = { userId: 'u-owner', orgId: 'org-1', role: 'OWNER', org: { id: 'org-1', name: 'Mela Loans' } } as any;
const member = { ...owner, userId: 'u-member', role: 'MEMBER' };
const inviter = { id: 'u-owner', name: 'Sami', email: 'sami@example.com' } as any;

function setup(overrides: Record<string, any> = {}) {
  const prisma: any = {
    membership: { findFirst: jest.fn().mockResolvedValue(null), findUnique: jest.fn(), count: jest.fn(), delete: jest.fn(), upsert: jest.fn() },
    invitation: {
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'inv-1', ...data, createdAt: new Date() })),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: { findUnique: jest.fn().mockResolvedValue(inviter) },
    $transaction: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
  const mail = { send: jest.fn() };
  const config = { getOrThrow: () => 'http://portal.test' };
  const audit = { record: jest.fn() };
  return { team: new TeamService(prisma, mail as any, config as any, audit as any), prisma, mail, audit };
}

describe('TeamService', () => {
  it('emails an invite link with a token whose hash is stored', async () => {
    const { team, prisma, mail } = setup();
    await team.invite(owner, inviter, ' New@Example.com ', 'MEMBER');
    const data = prisma.invitation.create.mock.calls[0][0].data;
    expect(data.email).toBe('new@example.com');
    const token = /token=([\w-]+)/.exec(mail.send.mock.calls[0][2])![1];
    expect(data.tokenHash).toBe(sha256(token));
  });

  it('records invitations in the audit log', async () => {
    const { team, audit } = setup();
    await team.invite(owner, inviter, 'new@example.com', 'MEMBER');
    expect(audit.record).toHaveBeenCalledWith('org-1', inviter, 'member.invited', 'new@example.com', { role: 'MEMBER' });
  });

  it('only lets owners invite', async () => {
    const { team } = setup();
    await expect(team.invite(member, inviter, 'x@example.com', 'MEMBER')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects inviting an existing member', async () => {
    const { team, prisma } = setup();
    prisma.membership.findFirst.mockResolvedValue({ userId: 'u-2' });
    await expect(team.invite(owner, inviter, 'x@example.com', 'MEMBER')).rejects.toBeInstanceOf(ConflictException);
  });

  it('accepts only for the invited email', async () => {
    const { team, prisma } = setup();
    prisma.invitation.findUnique.mockResolvedValue({ id: 'inv-1', orgId: 'org-1', email: 'new@example.com', role: 'MEMBER', acceptedAt: null, expiresAt: new Date(Date.now() + 1e6), org: owner.org });
    await expect(team.accept({ id: 'u-x', email: 'other@example.com' } as any, 'tok')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(team.accept({ id: 'u-new', email: 'new@example.com' } as any, 'tok')).resolves.toEqual({ orgId: 'org-1', orgName: 'Mela Loans' });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects expired or used invitations', async () => {
    const { team, prisma } = setup();
    prisma.invitation.findUnique.mockResolvedValue({ acceptedAt: new Date(), expiresAt: new Date(Date.now() + 1e6) });
    await expect(team.accept({ id: 'u', email: 'a@b.c' } as any, 'tok')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('keeps at least one owner', async () => {
    const { team, prisma } = setup();
    prisma.membership.findUnique.mockResolvedValue({ role: 'OWNER' });
    prisma.membership.count.mockResolvedValue(1);
    await expect(team.removeMember(owner, inviter, 'u-owner')).rejects.toBeInstanceOf(BadRequestException);
  });
});
