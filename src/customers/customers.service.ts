import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Customer, Environment, Prisma } from '@prisma/client';
import { randomToken } from '../common/crypto';
import { normalizePhone } from '../common/phone';
import { isTestCustomer, TEST_CHAT_ID, TEST_CUSTOMERS } from '../common/sandbox';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';

export interface TelegramChat {
  chatId: string;
  username?: string;
}

// Which customers an incoming Telegram update may touch: one live environment,
// or every sandbox environment (they share one bot).
export type ChatScope = { environmentId: string } | { environment: { type: 'SANDBOX' } };

export type CustomerWithEnvironment = Customer & { environment: Environment };

export type LinkResult =
  | { ok: true; customer: CustomerWithEnvironment; alreadyLinked: boolean }
  | { ok: false; reason: 'invalid' | 'sandbox_limit' };

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly telegram: TelegramService,
  ) {}

  async upsert(environment: Environment, externalId: string, phone?: string): Promise<Customer> {
    if (isTestCustomer(externalId) && environment.type === 'SANDBOX') return this.upsertTestCustomer(environment, externalId);
    const normalized = phone ? normalizePhone(phone) : undefined;
    return this.prisma.customer.upsert({
      where: { environmentId_externalId: { environmentId: environment.id, externalId } },
      create: { environmentId: environment.id, externalId, phone: normalized },
      update: normalized ? { phone: normalized } : {},
    });
  }

  // Test customers are created on first use with the state their name describes.
  upsertTestCustomer(environment: Environment, externalId: keyof typeof TEST_CUSTOMERS): Promise<Customer> {
    const spec = TEST_CUSTOMERS[externalId];
    const state = {
      telegramChatId: spec.linked ? TEST_CHAT_ID : null,
      linkedAt: spec.linked ? new Date(0) : null,
      blockedAt: spec.blocked ? new Date(0) : null,
    };
    return this.prisma.customer.upsert({
      where: { environmentId_externalId: { environmentId: environment.id, externalId } },
      create: { environmentId: environment.id, externalId, ...state },
      update: state,
    });
  }

  async createLink(environment: Environment, externalId: string, phone?: string) {
    if (isTestCustomer(externalId)) {
      throw new BadRequestException(`"${externalId}" is a built-in test customer and cannot be linked`);
    }
    const botUsername = this.telegram.botUsernameFor(environment);
    if (!botUsername) {
      throw new BadRequestException(
        environment.type === 'LIVE' ? 'Connect your Telegram bot in the portal first' : 'The sandbox bot is not configured on this server',
      );
    }
    await this.upsert(environment, externalId, phone);
    const ttlMinutes = Number(this.config.get('LINK_TOKEN_TTL_MINUTES', 10080));
    // Telegram limits the start parameter to 64 chars of [A-Za-z0-9_-]; base64url fits.
    const token = randomToken(24);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
    await this.prisma.linkToken.create({ data: { token, environmentId: environment.id, externalId, expiresAt } });
    return { token, url: `https://t.me/${botUsername}?start=${token}`, expiresAt };
  }

  async get(environment: Environment, externalId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { environmentId_externalId: { environmentId: environment.id, externalId } },
    });
    if (!customer) {
      if (isTestCustomer(externalId) && environment.type === 'SANDBOX') {
        return this.toView(await this.upsertTestCustomer(environment, externalId));
      }
      throw new NotFoundException('Customer not found');
    }
    return this.toView(customer);
  }

  async list(environment: Environment, options: { search?: string; linked?: boolean; cursor?: string; limit?: number }) {
    const take = Math.min(Math.max(options.limit ?? 50, 1), 100);
    const where: Prisma.CustomerWhereInput = {
      environmentId: environment.id,
      ...(options.search ? { externalId: { contains: options.search, mode: 'insensitive' } } : {}),
      ...(options.linked === true ? { telegramChatId: { not: null } } : {}),
      ...(options.linked === false ? { telegramChatId: null } : {}),
    };
    const customers = await this.prisma.customer.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });
    const page = customers.slice(0, take);
    return { data: page.map((c) => this.toView(c)), nextCursor: customers.length > take ? page[page.length - 1].id : null };
  }

  // Consumes a single-use link token from /start. Sandbox environments cap real linked customers.
  async linkByToken(scope: ChatScope, token: string, chat: TelegramChat): Promise<LinkResult> {
    const link = await this.prisma.linkToken.findFirst({
      where: { token, usedAt: null, expiresAt: { gt: new Date() }, environment: 'environmentId' in scope ? { id: scope.environmentId } : scope.environment },
      include: { environment: true },
    });
    if (!link) return { ok: false, reason: 'invalid' };

    if (link.environment.type === 'SANDBOX') {
      const limit = Number(this.config.get('SANDBOX_LINKED_CUSTOMER_LIMIT', 10));
      const linked = await this.prisma.customer.count({
        where: { environmentId: link.environmentId, telegramChatId: { not: null }, NOT: { telegramChatId: TEST_CHAT_ID }, externalId: { not: link.externalId } },
      });
      if (linked >= limit) return { ok: false, reason: 'sandbox_limit' };
    }

    const claimed = await this.prisma.linkToken.updateMany({ where: { token, usedAt: null }, data: { usedAt: new Date() } });
    if (claimed.count === 0) return { ok: false, reason: 'invalid' };
    // Opening a second link for the same customer from the same chat changes nothing.
    const before = await this.prisma.customer.findUnique({
      where: { environmentId_externalId: { environmentId: link.environmentId, externalId: link.externalId } },
    });
    const alreadyLinked = before?.telegramChatId === chat.chatId && !before.blockedAt;
    const customer = await this.prisma.customer.update({
      where: { environmentId_externalId: { environmentId: link.environmentId, externalId: link.externalId } },
      data: this.linkedFields(chat),
      include: { environment: true },
    });
    return { ok: true, customer, alreadyLinked };
  }

  // Live only: links every customer of this environment registered with the shared phone number.
  async linkByPhone(environmentId: string, phone: string, chat: TelegramChat): Promise<CustomerWithEnvironment[]> {
    const customers = await this.prisma.customer.findMany({
      where: { environmentId, phone: normalizePhone(phone) },
      include: { environment: true },
    });
    if (customers.length === 0) return [];
    await this.prisma.customer.updateMany({ where: { id: { in: customers.map((c) => c.id) } }, data: this.linkedFields(chat) });
    return customers;
  }

  // Called after a successful phone verification: stores the verified phone and links the chat.
  // Sandbox environments keep their cap on linked Telegram users.
  async linkVerified(environment: Environment, externalId: string, phone: string, chat: TelegramChat): Promise<{ linked: boolean }> {
    if (environment.type === 'SANDBOX') {
      const limit = Number(this.config.get('SANDBOX_LINKED_CUSTOMER_LIMIT', 10));
      const linked = await this.prisma.customer.count({
        where: { environmentId: environment.id, telegramChatId: { not: null }, NOT: { telegramChatId: TEST_CHAT_ID }, externalId: { not: externalId } },
      });
      if (linked >= limit) {
        await this.upsert(environment, externalId, phone);
        return { linked: false };
      }
    }
    await this.prisma.customer.upsert({
      where: { environmentId_externalId: { environmentId: environment.id, externalId } },
      create: { environmentId: environment.id, externalId, phone, ...this.linkedFields(chat) },
      update: { phone, ...this.linkedFields(chat) },
    });
    return { linked: true };
  }

  findByChat(scope: ChatScope, chatId: string): Promise<CustomerWithEnvironment[]> {
    return this.prisma.customer.findMany({ where: { ...scope, telegramChatId: chatId }, include: { environment: true } });
  }

  async setBlocked(scope: ChatScope, chatId: string, blocked: boolean): Promise<CustomerWithEnvironment[]> {
    const customers = await this.findByChat(scope, chatId);
    if (customers.length > 0) {
      await this.prisma.customer.updateMany({
        where: { id: { in: customers.map((c) => c.id) } },
        data: { blockedAt: blocked ? new Date() : null },
      });
    }
    return customers;
  }

  toView(customer: Customer) {
    const linked = Boolean(customer.telegramChatId);
    const blocked = Boolean(customer.blockedAt);
    return {
      externalId: customer.externalId,
      phone: customer.phone,
      // true when a message sent now would go out on Telegram.
      reachable: linked && !blocked,
      telegramLinked: linked,
      telegramUsername: customer.telegramUsername,
      linkedAt: customer.linkedAt,
      blocked,
      testCustomer: isTestCustomer(customer.externalId),
      createdAt: customer.createdAt,
    };
  }

  private linkedFields(chat: TelegramChat) {
    return { telegramChatId: chat.chatId, telegramUsername: chat.username ?? null, linkedAt: new Date(), blockedAt: null };
  }
}
