import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Customer, Environment, Message, MessageStatus, Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { CustomersService } from '../customers/customers.service';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { validateButtons } from './buttons';
import { DeliverJob, MESSAGES_QUEUE } from './messages.constants';
import { SendMessageDto } from './messages.dto';

export type MessageView = ReturnType<typeof toMessageView>;

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
    private readonly telegram: TelegramService,
    private readonly webhooks: WebhooksService,
    private readonly config: ConfigService,
    @InjectQueue(MESSAGES_QUEUE) private readonly queue: Queue<DeliverJob>,
  ) {}

  // Customers who cannot be reached on Telegram get an immediate UNDELIVERABLE
  // result, so the caller can switch to its own channel without waiting.
  async send(environment: Environment, dto: SendMessageDto): Promise<MessageView> {
    const buttons = validateButtons(dto.buttons);
    if (dto.idempotencyKey) {
      const existing = await this.findByIdempotencyKey(environment.id, dto.idempotencyKey);
      if (existing) return toMessageView(existing);
    }
    if (environment.type === 'LIVE' && !this.telegram.hasBot(environment)) {
      throw new BadRequestException('Connect your Telegram bot in the portal before sending live messages');
    }
    await this.enforceSandboxLimit(environment);

    const customer = await this.customers.upsert(environment, dto.to);
    const reason = !customer.telegramChatId ? 'not_linked' : customer.blockedAt ? 'blocked' : null;
    const status: MessageStatus = reason ? 'UNDELIVERABLE' : 'QUEUED';

    let message: Message & { customer: Customer };
    try {
      message = await this.prisma.message.create({
        data: {
          environmentId: environment.id,
          customerId: customer.id,
          direction: 'OUTBOUND',
          status,
          reason,
          text: dto.text,
          buttons: buttons ? (buttons as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
          idempotencyKey: dto.idempotencyKey,
        },
        include: { customer: true },
      });
    } catch (error) {
      // Lost a race with a concurrent request using the same idempotency key.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && dto.idempotencyKey) {
        const existing = await this.findByIdempotencyKey(environment.id, dto.idempotencyKey);
        if (existing) return toMessageView(existing);
      }
      throw error;
    }

    if (status === 'QUEUED') {
      await this.queue.add('deliver', { messageId: message.id }, { jobId: message.id });
    } else {
      await this.webhooks.emit(environment, 'message.undeliverable', toMessageView(message));
    }
    return toMessageView(message);
  }

  async get(environment: Environment, id: string): Promise<MessageView> {
    const message = await this.prisma.message.findFirst({ where: { id, environmentId: environment.id }, include: { customer: true } });
    if (!message) throw new NotFoundException('Message not found');
    return toMessageView(message);
  }

  async list(environment: Environment, options: { customer?: string; status?: MessageStatus; cursor?: string; limit?: number }) {
    const take = Math.min(Math.max(options.limit ?? 50, 1), 100);
    const messages = await this.prisma.message.findMany({
      where: {
        environmentId: environment.id,
        ...(options.customer ? { customer: { externalId: options.customer } } : {}),
        ...(options.status ? { status: options.status } : {}),
      },
      include: { customer: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });
    const page = messages.slice(0, take);
    return { data: page.map(toMessageView), nextCursor: messages.length > take ? page[page.length - 1].id : null };
  }

  async recordInbound(environment: Environment, customer: Customer, text: string, telegramMessageId: string) {
    const message = await this.prisma.message.create({
      data: {
        environmentId: environment.id,
        customerId: customer.id,
        direction: 'INBOUND',
        status: 'RECEIVED',
        text,
        telegramMessageId,
      },
      include: { customer: true },
    });
    await this.webhooks.emit(environment, 'message.received', toMessageView(message));
  }

  private findByIdempotencyKey(environmentId: string, idempotencyKey: string) {
    return this.prisma.message.findUnique({
      where: { environmentId_idempotencyKey: { environmentId, idempotencyKey } },
      include: { customer: true },
    });
  }

  private async enforceSandboxLimit(environment: Environment) {
    if (environment.type !== 'SANDBOX') return;
    const limit = Number(this.config.get('SANDBOX_DAILY_MESSAGE_LIMIT', 100));
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const sentToday = await this.prisma.message.count({
      where: { environmentId: environment.id, direction: 'OUTBOUND', createdAt: { gte: since } },
    });
    if (sentToday >= limit) {
      throw new HttpException(`Sandbox limit of ${limit} messages per day reached (resets 00:00 UTC)`, HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}

export function toMessageView(message: Message & { customer: Customer }) {
  return {
    id: message.id,
    to: message.customer.externalId,
    direction: message.direction,
    status: message.status,
    reason: message.reason,
    text: message.text,
    buttons: message.buttons,
    idempotencyKey: message.idempotencyKey,
    error: message.error,
    attempts: message.attempts,
    sentAt: message.sentAt,
    createdAt: message.createdAt,
  };
}
