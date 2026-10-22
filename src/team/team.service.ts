import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Membership, Organization, Role, User } from '@prisma/client';
import { randomToken, sha256 } from '../common/crypto';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';

const INVITE_DAYS = 7;

export type MembershipWithOrg = Membership & { org: Organization };

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async overview(org: Organization) {
    const [members, invitations] = await Promise.all([
      this.prisma.membership.findMany({ where: { orgId: org.id }, include: { user: true }, orderBy: { createdAt: 'asc' } }),
      this.prisma.invitation.findMany({ where: { orgId: org.id, acceptedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } }),
    ]);
    return {
      members: members.map((m) => ({ userId: m.userId, name: m.user.name, email: m.user.email, role: m.role, joinedAt: m.createdAt })),
      invitations: invitations.map((i) => ({ id: i.id, email: i.email, role: i.role, expiresAt: i.expiresAt, createdAt: i.createdAt })),
    };
  }

  async invite(membership: MembershipWithOrg, inviter: User, rawEmail: string, role: Role) {
    this.assertOwner(membership);
    const email = rawEmail.trim().toLowerCase();
    const existing = await this.prisma.membership.findFirst({ where: { orgId: membership.orgId, user: { email } } });
    if (existing) throw new ConflictException(`${email} is already a member`);

    const token = randomToken(32);
    // Re-inviting replaces any pending invitation for the same email.
    await this.prisma.invitation.deleteMany({ where: { orgId: membership.orgId, email, acceptedAt: null } });
    const invitation = await this.prisma.invitation.create({
      data: {
        orgId: membership.orgId,
        email,
        role,
        tokenHash: sha256(token),
        invitedById: inviter.id,
        expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000),
      },
    });
    const portal = this.config.getOrThrow<string>('PORTAL_URL').replace(/\/$/, '');
    await this.mail.send(
      email,
      `${inviter.name} invited you to ${membership.org.name} on Telenotify`,
      `Hi,\n\n${inviter.name} (${inviter.email}) invited you to join ${membership.org.name} on Telenotify as ${role === 'OWNER' ? 'an owner' : 'a member'}.\n\nAccept the invitation:\n${portal}/invite?token=${token}\n\nThis link expires in ${INVITE_DAYS} days.`,
    );
    await this.audit.record(membership.orgId, inviter, 'member.invited', email, { role });
    return { id: invitation.id, email, role, expiresAt: invitation.expiresAt, createdAt: invitation.createdAt };
  }

  async revokeInvitation(membership: MembershipWithOrg, actor: User, invitationId: string) {
    this.assertOwner(membership);
    const invitation = await this.prisma.invitation.findFirst({ where: { id: invitationId, orgId: membership.orgId, acceptedAt: null } });
    if (!invitation) throw new NotFoundException('Invitation not found');
    await this.prisma.invitation.delete({ where: { id: invitation.id } });
    await this.audit.record(membership.orgId, actor, 'invitation.revoked', invitation.email);
  }

  async removeMember(membership: MembershipWithOrg, actor: User, userId: string) {
    this.assertOwner(membership);
    const target = await this.prisma.membership.findUnique({ where: { userId_orgId: { userId, orgId: membership.orgId } }, include: { user: true } });
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === 'OWNER') {
      const owners = await this.prisma.membership.count({ where: { orgId: membership.orgId, role: 'OWNER' } });
      if (owners <= 1) throw new BadRequestException('An organization needs at least one owner');
    }
    await this.prisma.membership.delete({ where: { userId_orgId: { userId, orgId: membership.orgId } } });
    await this.audit.record(membership.orgId, actor, 'member.removed', target.user.email);
  }

  // Shown on the invite page before the person signs in.
  async preview(token: string) {
    const invitation = await this.findOpen(token);
    const inviter = await this.prisma.user.findUnique({ where: { id: invitation.invitedById } });
    return { orgName: invitation.org.name, email: invitation.email, role: invitation.role, invitedBy: inviter?.name ?? null };
  }

  async accept(user: User, token: string) {
    const invitation = await this.findOpen(token);
    if (invitation.email !== user.email) {
      throw new ForbiddenException(`This invitation is for ${invitation.email}. Sign in with that email to accept it.`);
    }
    await this.prisma.$transaction([
      this.prisma.membership.upsert({
        where: { userId_orgId: { userId: user.id, orgId: invitation.orgId } },
        create: { userId: user.id, orgId: invitation.orgId, role: invitation.role },
        update: {},
      }),
      this.prisma.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } }),
    ]);
    await this.audit.record(invitation.orgId, user, 'member.joined', user.email, { role: invitation.role });
    return { orgId: invitation.orgId, orgName: invitation.org.name };
  }

  private async findOpen(token: string) {
    const invitation = await this.prisma.invitation.findUnique({ where: { tokenHash: sha256(token) }, include: { org: true } });
    if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
      throw new NotFoundException('This invitation is invalid, expired or already used');
    }
    return invitation;
  }

  private assertOwner(membership: Membership) {
    if (membership.role !== 'OWNER') throw new ForbiddenException('Only owners can manage the team');
  }
}
