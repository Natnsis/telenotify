import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from './telegram.service';

// On startup, points every connected live bot at the current PUBLIC_BASE_URL, so a
// changed domain (or a new local tunnel) doesn't silently stop updates.
@Injectable()
export class LiveBotWebhooksService implements OnApplicationBootstrap {
  private readonly logger = new Logger(LiveBotWebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap() {
    void this.sync();
  }

  async sync(): Promise<void> {
    const base = this.config.getOrThrow<string>('PUBLIC_BASE_URL').replace(/\/$/, '');
    const environments = await this.prisma.environment.findMany({ where: { type: 'LIVE', botTokenEncrypted: { not: null } } });
    for (const environment of environments) {
      try {
        await this.telegram.clientForEnvironment(environment).setWebhook(`${base}/telegram/webhook/${environment.id}`, environment.webhookSecret);
        this.logger.log(`Live bot @${environment.botUsername} webhook set`);
      } catch (error) {
        this.logger.error(`Could not set webhook for live bot @${environment.botUsername}: ${(error as Error).message}`);
      }
    }
  }
}
