import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Environment, Verification } from '@prisma/client';
import { randomToken } from '../common/crypto';
import { normalizePhone } from '../common/phone';
import { isTestCustomer } from '../common/sandbox';
import { ChatScope, CustomersService, TelegramChat } from '../customers/customers.service';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { WebhooksService } from '../webhooks/webhooks.service';

// Telegram start parameters for verification links look like "v_<token>".
export const VERIFICATION_PREFIX = 'v_';

export type ContactOutcome =
  | { kind: 'none' }
  | { kind: 'not_own_contact' }
  | { kind: 'verified'; orgName: string }
  | { kind: 'mismatch'; orgName: string };

@Injectable()
export class VerificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
    private readonly customers: CustomersService,
    private readonly webhooks: WebhooksService,
  ) {}

  async create(environment: Environment, input: { externalId?: string; phone?: string; expiresInMinutes?: number }) {
    if (input.externalId && isTestCustomer(input.externalId)) {
      throw new BadRequestException(`"${input.externalId}" is a built-in test customer and cannot be verified`);
    }
    const botUsername = this.telegram.botUsernameFor(environment);
    if (!botUsername) {
      throw new BadRequestException(
        environment.type === 'LIVE' ? 'Connect your Telegram bot in the portal first' : 'The sandbox bot is not configured on this server',
      );
    }
    const verification = await this.prisma.verification.create({
      data: {
        environmentId: environment.id,
        token: randomToken(18),
        externalId: input.externalId,
        expectedPhone: input.phone ? normalizePhone(input.phone) : undefined,
        expiresAt: new Date(Date.now() + (input.expiresInMinutes ?? 10) * 60_000),
      },
    });
    return this.toView(verification, botUsername);
  }

  async get(environment: Environment, id: string) {
    const verification = await this.prisma.verification.findFirst({ where: { id, environmentId: environment.id } });
    if (!verification) throw new NotFoundException('Verification not found');
    return this.toView(await this.expireIfDue(verification), this.telegram.botUsernameFor(environment));
  }

  // The person opened the link: remember their chat so the contact they share is attributed correctly.
  async start(scope: ChatScope, token: string, chat: TelegramChat): Promise<{ orgName: string } | null> {
    const verification = await this.prisma.verification.findFirst({
      where: { token, status: { in: ['PENDING', 'AWAITING_CONTACT'] }, environment: 'environmentId' in scope ? { id: scope.environmentId } : scope.environment },
      include: { environment: { include: { org: true } } },
    });
    if (!verification) return null;
    if (verification.expiresAt < new Date()) {
      await this.expireIfDue(verification);
      return null;
    }
    // Only one open verification per chat, so a shared contact can't be misattributed.
    await this.prisma.verification.updateMany({
      where: { telegramChatId: chat.chatId, status: 'AWAITING_CONTACT', NOT: { id: verification.id } },
      data: { status: 'EXPIRED' },
    });
    await this.prisma.verification.update({
      where: { id: verification.id },
      data: { status: 'AWAITING_CONTACT', telegramChatId: chat.chatId },
    });
    return { orgName: verification.environment.org.name };
  }

  // Handles a shared contact if this chat has an open verification.
  async completeWithContact(
    scope: ChatScope,
    chat: TelegramChat,
    contact: { phone_number: string; user_id?: number },
    fromUserId: number,
  ): Promise<ContactOutcome> {
    const verification = await this.prisma.verification.findFirst({
      where: {
        telegramChatId: chat.chatId,
        status: 'AWAITING_CONTACT',
        expiresAt: { gt: new Date() },
        environment: 'environmentId' in scope ? { id: scope.environmentId } : scope.environment,
      },
      include: { environment: { include: { org: true } } },
      orderBy: { createdAt: 'desc' },
    });
    if (!verification) return { kind: 'none' };
    // Telegram only guarantees ownership when the shared contact is the sender's own.
    if (contact.user_id !== fromUserId) return { kind: 'not_own_contact' };

    const phone = normalizePhone(contact.phone_number);
    const { environment } = verification;
    const orgName = environment.org.name;

    if (verification.expectedPhone && verification.expectedPhone !== phone) {
      const failed = await this.prisma.verification.update({
        where: { id: verification.id },
        data: { status: 'FAILED', reason: 'phone_mismatch', phone, telegramUserId: String(fromUserId) },
      });
      await this.webhooks.emit(environment, 'verification.failed', this.toView(failed));
      return { kind: 'mismatch', orgName };
    }

    const verified = await this.prisma.verification.update({
      where: { id: verification.id },
      data: { status: 'VERIFIED', phone, telegramUserId: String(fromUserId), verifiedAt: new Date() },
    });
    if (verification.externalId) {
      const { linked } = await this.customers.linkVerified(environment, verification.externalId, phone, chat);
      if (linked) {
        await this.webhooks.emit(environment, 'customer.linked', { externalId: verification.externalId, method: 'verification' });
      }
    }
    await this.webhooks.emit(environment, 'verification.completed', this.toView(verified));
    return { kind: 'verified', orgName };
  }

  toView(verification: Verification, botUsername?: string) {
    return {
      id: verification.id,
      status: verification.status,
      reason: verification.reason,
      externalId: verification.externalId,
      // The verified number, once VERIFIED (or the mismatching one, on phone_mismatch).
      phone: verification.phone,
      url: botUsername && ['PENDING', 'AWAITING_CONTACT'].includes(verification.status) ? `https://t.me/${botUsername}?start=${VERIFICATION_PREFIX}${verification.token}` : null,
      expiresAt: verification.expiresAt,
      verifiedAt: verification.verifiedAt,
      createdAt: verification.createdAt,
    };
  }

  private async expireIfDue(verification: Verification): Promise<Verification> {
    if (!['PENDING', 'AWAITING_CONTACT'].includes(verification.status) || verification.expiresAt > new Date()) return verification;
    return this.prisma.verification.update({ where: { id: verification.id }, data: { status: 'EXPIRED' } });
  }
}
