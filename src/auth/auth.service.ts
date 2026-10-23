import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User, UserTokenType } from '@prisma/client';
import { hashPassword, randomToken, sha256, verifyPassword } from '../common/crypto';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { TelegramService } from '../telegram/telegram.service';
import { PrismaService } from '../prisma/prisma.service';

const SESSION_DAYS = 30;
const VERIFY_HOURS = 48;
const RESET_HOURS = 1;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly telegram: TelegramService,
  ) {}

  private readonly logger = new Logger(AuthService.name);

  async signup(name: string, email: string, password: string): Promise<User> {
    const normalized = email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (existing) {
      throw new ConflictException(
        existing.passwordHash ? 'An account with this email already exists' : 'This email signs in with Google',
      );
    }
    const user = await this.prisma.user.create({
      data: { name: name.trim(), email: normalized, passwordHash: await hashPassword(password) },
    });
    await this.sendVerification(user);
    return user;
  }

  async login(email: string, password: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    // Same error for unknown email and wrong password.
    if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException('Incorrect email or password');
    }
    return user;
  }

  async createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const token = randomToken(32);
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
    await this.prisma.session.create({ data: { tokenHash: sha256(token), userId, expiresAt } });
    return { token, expiresAt };
  }

  async destroySession(token: string | undefined): Promise<void> {
    if (token) await this.prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  }

  async sendVerification(user: User): Promise<void> {
    if (user.emailVerifiedAt) return;
    const token = await this.issueToken(user.id, 'EMAIL_VERIFY', VERIFY_HOURS);
    // Sign-up shouldn't wait for (or fail on) SMTP; MailService logs a failed send.
    void this.mail.send(
      user.email,
      'Verify your Telenotify email',
      `Hi ${user.name},\n\nConfirm your email to start using Telenotify:\n${this.portalUrl()}/verify-email?token=${token}\n\nThis link expires in ${VERIFY_HOURS} hours.`,
    );
  }

  async verifyEmail(token: string): Promise<User> {
    const userId = await this.consumeToken(token, 'EMAIL_VERIFY');
    return this.prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  }

  // Always succeeds, so the endpoint does not reveal which emails have accounts.
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user) return;
    const token = await this.issueToken(user.id, 'PASSWORD_RESET', RESET_HOURS);
    // Don't wait for SMTP: the response stays fast and takes the same time whether
    // or not the account exists. MailService logs a failed send.
    void this.mail.send(
      user.email,
      'Reset your Telenotify password',
      `Hi ${user.name},\n\nReset your password here:\n${this.portalUrl()}/reset-password?token=${token}\n\nThis link expires in ${RESET_HOURS} hour. If you didn't ask for this, ignore this email.`,
    );
  }

  async resetPassword(token: string, password: string): Promise<User> {
    const userId = await this.consumeToken(token, 'PASSWORD_RESET');
    // Clicking the emailed link proves the email, and all old sessions are signed out.
    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: await hashPassword(password), emailVerifiedAt: new Date() },
      }),
      this.prisma.session.deleteMany({ where: { userId } }),
    ]);
    return user;
  }

  // Google sign-in: match by Google account, then by verified email, else create.
  async findOrCreateGoogleUser(profile: { sub: string; email: string; name: string }): Promise<User> {
    const email = profile.email.toLowerCase();
    const bySub = await this.prisma.user.findUnique({ where: { googleSub: profile.sub } });
    if (bySub) return bySub;
    const byEmail = await this.prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      return this.prisma.user.update({
        where: { id: byEmail.id },
        data: { googleSub: profile.sub, emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date() },
      });
    }
    return this.prisma.user.create({
      data: { email, name: profile.name || email.split('@')[0], googleSub: profile.sub, emailVerifiedAt: new Date() },
    });
  }

  async updateProfile(user: User, name: string): Promise<User> {
    return this.prisma.user.update({ where: { id: user.id }, data: { name: name.trim() } });
  }

  // Sets or changes the password and signs out every other session.
  async changePassword(user: User, currentSessionToken: string | undefined, currentPassword: string | undefined, newPassword: string) {
    if (user.passwordHash && !(currentPassword && (await verifyPassword(currentPassword, user.passwordHash)))) {
      throw new UnauthorizedException('Your current password is incorrect');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } }),
      this.prisma.session.deleteMany({ where: { userId: user.id, ...(currentSessionToken ? { NOT: { tokenHash: sha256(currentSessionToken) } } : {}) } }),
    ]);
  }

  // Deletes the account. Organizations where the user is the only member are deleted
  // too; an organization with other members needs another owner first.
  async deleteAccount(user: User, confirmEmail: string) {
    if (confirmEmail.trim().toLowerCase() !== user.email) throw new BadRequestException('Type your email address exactly to confirm');
    const memberships = await this.prisma.membership.findMany({
      where: { userId: user.id },
      include: { org: { include: { memberships: true, environments: true } } },
    });
    const blocking = memberships.filter(
      (m) => m.role === 'OWNER' && m.org.memberships.length > 1 && m.org.memberships.filter((x) => x.role === 'OWNER').length === 1,
    );
    if (blocking.length > 0) {
      throw new ForbiddenException(
        `You're the only owner of ${blocking.map((m) => m.org.name).join(', ')}. Make someone else an owner (invite them as owner) or remove the other members first.`,
      );
    }
    for (const m of memberships) {
      if (m.org.memberships.length === 1) {
        await this.releaseLiveBot(m.org.environments);
        await this.prisma.organization.delete({ where: { id: m.orgId } });
      } else {
        await this.audit.record(m.orgId, user, 'member.left', user.email, { reason: 'account deleted' });
      }
    }
    await this.prisma.user.delete({ where: { id: user.id } });
  }

  // Detaches a deleted organization's live bot from our webhook (best effort).
  async releaseLiveBot(environments: { type: string; botTokenEncrypted: string | null }[]) {
    const live = environments.find((e) => e.type === 'LIVE' && e.botTokenEncrypted);
    if (!live) return;
    try {
      await this.telegram.clientForEnvironment(live as never).deleteWebhook();
    } catch (error) {
      this.logger.warn(`Could not remove live bot webhook: ${(error as Error).message}`);
    }
  }

  toView(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: Boolean(user.emailVerifiedAt),
      hasPassword: Boolean(user.passwordHash),
      googleLinked: Boolean(user.googleSub),
    };
  }

  portalUrl(): string {
    return this.config.getOrThrow<string>('PORTAL_URL').replace(/\/$/, '');
  }

  private async issueToken(userId: string, type: UserTokenType, hours: number): Promise<string> {
    const token = randomToken(32);
    // Only the newest link of each type works.
    await this.prisma.userToken.deleteMany({ where: { userId, type, usedAt: null } });
    await this.prisma.userToken.create({
      data: { tokenHash: sha256(token), userId, type, expiresAt: new Date(Date.now() + hours * 3_600_000) },
    });
    return token;
  }

  private async consumeToken(token: string, type: UserTokenType): Promise<string> {
    const tokenHash = sha256(token);
    const claimed = await this.prisma.userToken.updateMany({
      where: { tokenHash, type, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claimed.count === 0) throw new BadRequestException('This link is invalid or has expired');
    const { userId } = await this.prisma.userToken.findUniqueOrThrow({ where: { tokenHash } });
    return userId;
  }
}
