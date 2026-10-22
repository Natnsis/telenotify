import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';

// Fixed one-second window per bot, shared by every worker through Redis. Telegram
// allows a bot roughly 30 messages per second; the default stays under that.
@Injectable()
export class BotRateLimiter implements OnModuleDestroy {
  private readonly redis: IORedis;
  readonly perSecond: number;

  constructor(config: ConfigService) {
    this.redis = new IORedis({
      host: config.get('REDIS_HOST', 'localhost'),
      port: Number(config.get('REDIS_PORT', 6379)),
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });
    this.perSecond = Number(config.get('PER_BOT_MESSAGES_PER_SECOND', 25));
  }

  /** true if this bot may send now; false means wait for the next second. */
  async tryAcquire(botKey: string, now = Date.now()): Promise<boolean> {
    const key = `tn:rl:bot:${botKey}:${Math.floor(now / 1000)}`;
    const results = await this.redis.multi().incr(key).pexpire(key, 2000).exec();
    const count = Number(results?.[0]?.[1] ?? 0);
    return count <= this.perSecond;
  }

  async onModuleDestroy() {
    this.redis.disconnect();
  }
}
