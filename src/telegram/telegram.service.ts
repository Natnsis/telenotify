import { BadRequestException, Injectable, Logger, OnApplicationBootstrap, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Environment } from '@prisma/client';
import { decrypt } from '../common/crypto';
import { TelegramApiClient } from './telegram-api.client';

// Sandbox environments share one bot we own (SANDBOX_BOT_TOKEN).
// Live environments each use the organization's own @BotFather bot.
@Injectable()
export class TelegramService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TelegramService.name);
  private sandboxUsername?: string;

  constructor(private readonly config: ConfigService) {}

  async onApplicationBootstrap() {
    const token = this.config.get<string>('SANDBOX_BOT_TOKEN');
    this.sandboxUsername = this.config.get<string>('SANDBOX_BOT_USERNAME') || undefined;
    if (!token) {
      this.logger.warn('SANDBOX_BOT_TOKEN is not set; sandbox Telegram linking is disabled (test customers still work).');
      return;
    }
    try {
      const client = new TelegramApiClient(token);
      this.sandboxUsername = (await client.getMe()).username;
      const base = this.config.getOrThrow<string>('PUBLIC_BASE_URL').replace(/\/$/, '');
      await client.setWebhook(`${base}/telegram/webhook/sandbox`, this.config.getOrThrow('SANDBOX_WEBHOOK_SECRET'));
      this.logger.log(`Sandbox bot @${this.sandboxUsername} ready`);
    } catch (error) {
      this.logger.error(`Sandbox bot setup failed: ${(error as Error).message}`);
    }
  }

  clientForToken(botToken: string): TelegramApiClient {
    return new TelegramApiClient(botToken);
  }

  clientForEnvironment(environment: Environment): TelegramApiClient {
    if (environment.type === 'SANDBOX') return this.sandboxClient();
    if (!environment.botTokenEncrypted) {
      throw new BadRequestException('Connect your Telegram bot in the portal before using the live environment');
    }
    return new TelegramApiClient(decrypt(environment.botTokenEncrypted, this.config.getOrThrow('ENCRYPTION_KEY')));
  }

  sandboxClient(): TelegramApiClient {
    const token = this.config.get<string>('SANDBOX_BOT_TOKEN');
    if (!token) throw new ServiceUnavailableException('The sandbox bot is not configured on this server');
    return new TelegramApiClient(token);
  }

  botUsernameFor(environment: Environment): string | undefined {
    return environment.type === 'SANDBOX' ? this.sandboxUsername : (environment.botUsername ?? undefined);
  }

  hasBot(environment: Environment): boolean {
    return environment.type === 'SANDBOX' ? Boolean(this.config.get('SANDBOX_BOT_TOKEN')) : Boolean(environment.botTokenEncrypted);
  }
}
