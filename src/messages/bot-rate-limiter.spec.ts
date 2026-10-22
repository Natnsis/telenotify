import { DelayedError } from 'bullmq';
import { BotRateLimiter } from './bot-rate-limiter.service';
import { MessagesProcessor, nextWindowStart } from './messages.processor';

// In-memory stand-in for the two Redis commands the limiter uses.
function fakeRedis() {
  const counts = new Map<string, number>();
  return {
    multi() {
      const ops: string[] = [];
      const chain = {
        incr(key: string) {
          ops.push(key);
          return chain;
        },
        pexpire() {
          return chain;
        },
        async exec() {
          const key = ops[0];
          counts.set(key, (counts.get(key) ?? 0) + 1);
          return [[null, counts.get(key)], [null, 1]];
        },
      };
      return chain;
    },
    disconnect() {},
  };
}

function limiter(perSecond: number) {
  const config = { get: (key: string, fallback: unknown) => (key === 'PER_BOT_MESSAGES_PER_SECOND' ? perSecond : fallback) };
  const l = new BotRateLimiter(config as any);
  (l as any).redis = fakeRedis();
  return l;
}

describe('BotRateLimiter', () => {
  it('allows up to the limit per bot per second, then refuses', async () => {
    const l = limiter(2);
    const now = 1_000_000;
    expect(await l.tryAcquire('bot-a', now)).toBe(true);
    expect(await l.tryAcquire('bot-a', now)).toBe(true);
    expect(await l.tryAcquire('bot-a', now)).toBe(false);
  });

  it('keeps bots independent and resets each second', async () => {
    const l = limiter(1);
    const now = 2_000_000;
    expect(await l.tryAcquire('bot-a', now)).toBe(true);
    expect(await l.tryAcquire('bot-b', now)).toBe(true);
    expect(await l.tryAcquire('bot-a', now + 1000)).toBe(true);
  });
});

describe('MessagesProcessor rate limiting', () => {
  it('delays the job (without using an attempt) when the bot is over its limit', async () => {
    const delivery = { deliver: jest.fn() };
    const processor = new MessagesProcessor(delivery as any, { tryAcquire: jest.fn().mockResolvedValue(false) } as any);
    const job = { data: { messageId: 'm1', botKey: 'env-1' }, attemptsMade: 0, opts: { attempts: 5 }, moveToDelayed: jest.fn() } as any;
    await expect(processor.process(job, 'tok')).rejects.toBeInstanceOf(DelayedError);
    expect(job.moveToDelayed).toHaveBeenCalledWith(expect.any(Number), 'tok');
    expect(delivery.deliver).not.toHaveBeenCalled();
  });

  it('delivers when the bot has budget', async () => {
    const delivery = { deliver: jest.fn() };
    const processor = new MessagesProcessor(delivery as any, { tryAcquire: jest.fn().mockResolvedValue(true) } as any);
    await processor.process({ data: { messageId: 'm1', botKey: 'env-1' }, attemptsMade: 0, opts: { attempts: 5 } } as any, 'tok');
    expect(delivery.deliver).toHaveBeenCalledWith('m1', false);
  });
});

describe('nextWindowStart', () => {
  it('brings high-priority jobs back before normal ones in the next second', () => {
    const now = 5_000_420;
    for (let i = 0; i < 50; i++) {
      const high = nextWindowStart(true, now);
      const normal = nextWindowStart(false, now);
      expect(high).toBeGreaterThanOrEqual(5_001_000);
      expect(high).toBeLessThan(normal);
    }
  });
});
