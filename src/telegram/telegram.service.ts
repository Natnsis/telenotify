import { BadRequestException, Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Environment } from '@prisma/client';
import { decrypt } from '../common/crypto';
import { TelegramApiClient } from './telegram-api.client';

const RETRY_MAX_MS = 60_000;

// Sandbox environments share one bot we own (SANDBOX_BOT_TOKEN).
// Live environments each use the organization's own @BotFather bot.
@Injectable()
export class TelegramService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private sandboxUsername?: string;
  private retryTimer?: NodeJS.Timeout;

  constructor(private readonly config: ConfigService) {}

  onApplicationBootstrap() {
    this.sandboxUsername = this.config.get<string>('SANDBOX_BOT_USERNAME') || undefined;
    if (!this.config.get<string>('SANDBOX_BOT_TOKEN')) {
      this.logger.warn('SANDBOX_BOT_TOKEN is not set; sandbox Telegram linking is disabled (test customers still work).');
      return;
    }
    // Don't block startup on Telegram; keep retrying in the background until it answers.
    void this.setUpSandboxBot(0);
  }

  onModuleDestroy() {
    clearTimeout(this.retryTimer);
  }

  private async setUpSandboxBot(attempt: number): Promise<void> {
    try {
      const client = this.sandboxClient();
      this.sandboxUsername = (await client.getMe()).username;
      const base = this.config.getOrThrow<string>('PUBLIC_BASE_URL').replace(/\/$/, '');
      await client.setWebhook(`${base}/telegram/webhook/sandbox`, this.config.getOrThrow('SANDBOX_WEBHOOK_SECRET'));
      this.logger.log(`Sandbox bot @${this.sandboxUsername} ready`);
    } catch (error) {
      const delay = Math.min(RETRY_MAX_MS, 2_000 * 2 ** attempt);
      this.logger.error(`Sandbox bot setup failed (attempt ${attempt + 1}): ${(error as Error).message}. Retrying in ${delay / 1000}s.`);
      this.retryTimer = setTimeout(() => void this.setUpSandboxBot(attempt + 1), delay);
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
