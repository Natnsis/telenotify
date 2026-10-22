import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Environment, EnvironmentType, Organization, User } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { encrypt, randomToken, sha256 } from '../common/crypto';
import { assertPublicUrl, BlockedAddressError } from '../common/network-guard';
import { TEST_CUSTOMERS } from '../common/sandbox';
import { toMessageView } from '../messages/messages.service';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramApiError } from '../telegram/telegram-api.client';
import { TelegramService } from '../telegram/telegram.service';
import { WebhooksService } from '../webhooks/webhooks.service';

const KEY_PREFIX: Record<EnvironmentType, string> = { SANDBOX: 'tn_test_', LIVE: 'tn_live_' };

@Injectable()
export class PortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
    private readonly webhooks: WebhooksService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  // ---------- Organizations ----------

  // Creates the org with both environments and a first sandbox key (returned once).
  async createOrg(user: User, name: string) {
    const org = await this.prisma.organization.create({
      data: {
        name: name.trim(),
        memberships: { create: { userId: user.id, role: 'OWNER' } },
        environments: {
          create: (['SANDBOX', 'LIVE'] as const).map((type) => ({
            type,
            webhookSecret: randomToken(32),
            eventSigningSecret: `whsec_${randomToken(24)}`,
          })),
        },
      },
      include: { environments: true },
    });
    await this.audit.record(org.id, user, 'org.created', org.name);
    const sandbox = org.environments.find((e) => e.type === 'SANDBOX')!;
    const sandboxKey = await this.createKey(sandbox, 'Default sandbox key', user);
    return { org: { id: org.id, name: org.name }, sandboxKey };
  }

  async listOrgs(user: User) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId: user.id },
      include: { org: true },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map((m) => ({ id: m.org.id, name: m.org.name, role: m.role }));
  }

  async getOrg(org: Organization, role: string) {
    const environments = await this.prisma.environment.findMany({ where: { orgId: org.id } });
    const live = environments.find((e) => e.type === 'LIVE')!;
    return {
      id: org.id,
      name: org.name,
      role,
      plan: org.plan,
      liveBotConnected: Boolean(live.botTokenEncrypted),
      liveBotUsername: live.botUsername,
    };
  }

  // ---------- Environment settings ----------

  async environmentView(environment: Environment) {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const [messagesToday, linkedCustomers] = await Promise.all([
      this.prisma.message.count({ where: { environmentId: environment.id, direction: 'OUTBOUND', createdAt: { gte: since } } }),
      this.prisma.customer.count({ where: { environmentId: environment.id, telegramChatId: { not: null }, externalId: { notIn: Object.keys(TEST_CUSTOMERS) } } }),
    ]);
    const isSandbox = environment.type === 'SANDBOX';
    return {
      type: environment.type.toLowerCase(),
      keyPrefix: KEY_PREFIX[environment.type],
      botConnected: this.telegram.hasBot(environment),
      botUsername: this.telegram.botUsernameFor(environment) ?? null,
      eventWebhookUrl: environment.eventWebhookUrl,
      eventSigningSecret: environment.eventSigningSecret,
      usage: {
        messagesToday,
        linkedCustomers,
        ...(isSandbox
          ? {
              dailyMessageLimit: Number(this.config.get('SANDBOX_DAILY_MESSAGE_LIMIT', 100)),
              linkedCustomerLimit: Number(this.config.get('SANDBOX_LINKED_CUSTOMER_LIMIT', 10)),
            }
          : {}),
      },
      testCustomers: isSandbox ? Object.keys(TEST_CUSTOMERS) : [],
    };
  }

  async updateEnvironment(environment: Environment, eventWebhookUrl: string | null, actor: User) {
    if (eventWebhookUrl !== null) await this.assertWebhookUrl(environment, eventWebhookUrl);
    const updated = await this.prisma.environment.update({ where: { id: environment.id }, data: { eventWebhookUrl } });
    if (eventWebhookUrl !== environment.eventWebhookUrl) {
      await this.audit.record(environment.orgId, actor, 'webhook.updated', eventWebhookUrl ?? 'removed', { environment: environment.type.toLowerCase() });
    }
    return this.environmentView(updated);
  }

  async rotateSigningSecret(environment: Environment, actor: User) {
    await this.audit.record(environment.orgId, actor, 'signing_secret.rotated', null, { environment: environment.type.toLowerCase() });
    const updated = await this.prisma.environment.update({
      where: { id: environment.id },
      data: { eventSigningSecret: `whsec_${randomToken(24)}` },
    });
    return this.environmentView(updated);
  }

  // Delivered immediately (no retries) so the portal can show the result.
  sendTestEvent(environment: Environment) {
    if (!environment.eventWebhookUrl) throw new BadRequestException('Set a webhook URL first');
    return this.webhooks.sendTest(environment);
  }

  // ---------- Message detail ----------

  // Everything a developer needs to debug one message: its lifecycle, the request
  // that created it, and the webhook events it produced.
  async messageDetail(environment: Environment, messageId: string) {
    const message = await this.prisma.message.findFirst({ where: { id: messageId, environmentId: environment.id }, include: { customer: true } });
    if (!message) throw new NotFoundException('Message not found');
    const deliveries = await this.prisma.webhookDelivery.findMany({ where: { messageId: message.id }, orderBy: { createdAt: 'asc' } });
    const view = toMessageView(message);
    return {
      ...view,
      telegramMessageId: message.telegramMessageId,
      customer: {
        externalId: message.customer.externalId,
        telegramLinked: Boolean(message.customer.telegramChatId),
        blocked: Boolean(message.customer.blockedAt),
        telegramUsername: message.customer.telegramUsername,
      },
      request:
        message.direction === 'OUTBOUND'
          ? {
              to: message.customer.externalId,
              text: message.text,
              ...(message.buttons ? { buttons: message.buttons } : {}),
              ...(message.idempotencyKey ? { idempotencyKey: message.idempotencyKey } : {}),
            }
          : null,
      events: deliveries.map((d) => this.webhooks.toView(d)),
    };
  }

  // ---------- Live bot ----------

  async connectBot(environment: Environment, botToken: string, actor: User) {
    if (environment.type !== 'LIVE') throw new BadRequestException('The sandbox uses the shared Telenotify bot');
    if (botToken === this.config.get('SANDBOX_BOT_TOKEN')) throw new BadRequestException('That is the sandbox bot');
    const client = this.telegram.clientForToken(botToken.trim());
    let bot: { username: string };
    try {
      bot = await client.getMe();
    } catch (error) {
      if (error instanceof TelegramApiError) throw new BadRequestException(`Telegram rejected the bot token: ${error.description}`);
      throw error;
    }
    // One bot can only have one webhook, so it cannot serve two organizations.
    const taken = await this.prisma.environment.findFirst({ where: { botUsername: bot.username, NOT: { id: environment.id } } });
    if (taken) throw new ConflictException(`@${bot.username} is already connected to another organization`);

    const base = this.config.getOrThrow<string>('PUBLIC_BASE_URL').replace(/\/$/, '');
    try {
      await client.setWebhook(`${base}/telegram/webhook/${environment.id}`, environment.webhookSecret);
    } catch (error) {
      if (!(error instanceof TelegramApiError)) throw error;
      // Usually a server misconfiguration (PUBLIC_BASE_URL not public HTTPS), not the user's token.
      throw new BadRequestException(
        `Your token is valid (@${bot.username}), but Telegram could not reach this server at ${base}: ${error.description}. ` +
          'PUBLIC_BASE_URL must be a public HTTPS address.',
      );
    }
    const updated = await this.prisma.environment.update({
      where: { id: environment.id },
      data: { botTokenEncrypted: encrypt(botToken.trim(), this.config.getOrThrow('ENCRYPTION_KEY')), botUsername: bot.username },
    });
    await this.audit.record(environment.orgId, actor, 'bot.connected', `@${bot.username}`);
    return this.environmentView(updated);
  }

  async disconnectBot(environment: Environment, actor: User) {
    if (environment.botUsername) await this.audit.record(environment.orgId, actor, 'bot.disconnected', `@${environment.botUsername}`);
    if (environment.type !== 'LIVE') throw new BadRequestException('The sandbox uses the shared Telenotify bot');
    const updated = await this.prisma.environment.update({
      where: { id: environment.id },
      data: { botTokenEncrypted: null, botUsername: null },
    });
    return this.environmentView(updated);
  }

  // ---------- API keys ----------

  async listKeys(environment: Environment) {
    const keys = await this.prisma.apiKey.findMany({ where: { environmentId: environment.id }, orderBy: { createdAt: 'desc' } });
    return keys.map((k) => this.keyView(k));
  }

  // Returns the plaintext key once; only its hash is stored.
  async createKey(environment: Environment, name: string, actor: User) {
    const key = `${KEY_PREFIX[environment.type]}${randomToken(24)}`;
    const created = await this.prisma.apiKey.create({
      data: { environmentId: environment.id, name: name.trim(), keyHash: sha256(key), prefix: key.slice(0, 12), createdById: actor.id },
    });
    await this.audit.record(environment.orgId, actor, 'api_key.created', created.name, { environment: environment.type.toLowerCase(), prefix: created.prefix });
    return { ...this.keyView(created), key };
  }

  async revokeKey(environment: Environment, keyId: string, actor: User) {
    const key = await this.prisma.apiKey.findFirst({ where: { id: keyId, environmentId: environment.id, revokedAt: null } });
    if (!key) throw new NotFoundException('Key not found');
    await this.prisma.apiKey.update({ where: { id: key.id }, data: { revokedAt: new Date() } });
    await this.audit.record(environment.orgId, actor, 'api_key.revoked', key.name, { environment: environment.type.toLowerCase(), prefix: key.prefix });
  }

  private keyView(key: { id: string; name: string; prefix: string; lastUsedAt: Date | null; revokedAt: Date | null; createdAt: Date }) {
    return { id: key.id, name: key.name, prefix: key.prefix, lastUsedAt: key.lastUsedAt, revokedAt: key.revokedAt, createdAt: key.createdAt };
  }

  private async assertWebhookUrl(environment: Environment, value: string) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new BadRequestException('Webhook URL is not a valid URL');
    }
    const allowHttp = environment.type === 'SANDBOX';
    if (url.protocol !== 'https:' && !(allowHttp && url.protocol === 'http:')) {
      throw new BadRequestException(allowHttp ? 'Webhook URL must be http(s)' : 'Live webhook URLs must use https');
    }
    if (url.username || url.password) throw new BadRequestException('Webhook URL must not contain credentials');
    if (this.config.get('ALLOW_PRIVATE_WEBHOOK_URLS') === 'true') return;
    try {
      await assertPublicUrl(url);
    } catch (error) {
      throw new BadRequestException(
        error instanceof BlockedAddressError
          ? `Webhook URL must be publicly reachable: ${error.message}`
          : `Could not resolve ${url.hostname}`,
      );
    }
  }
}
