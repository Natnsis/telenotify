import { TelegramApiClient } from './telegram-api.client';
import { TelegramService } from './telegram.service';

describe('TelegramService sandbox bot setup', () => {
  const config = {
    get: (key: string) => ({ SANDBOX_BOT_TOKEN: '1:abc' } as Record<string, string>)[key],
    getOrThrow: (key: string) => ({ PUBLIC_BASE_URL: 'https://api.test', SANDBOX_WEBHOOK_SECRET: 's' } as Record<string, string>)[key],
  };

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('keeps retrying until Telegram answers, then exposes the bot username', async () => {
    jest.useFakeTimers();
    const getMe = jest
      .spyOn(TelegramApiClient.prototype, 'getMe')
      .mockRejectedValueOnce(new Error('The operation was aborted due to timeout'))
      .mockResolvedValue({ id: 1, username: 'sandbox_bot', first_name: 'Sandbox' });
    jest.spyOn(TelegramApiClient.prototype, 'setWebhook').mockResolvedValue(true);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const service = new TelegramService(config as any);
    service.onApplicationBootstrap();
    await jest.advanceTimersByTimeAsync(0);
    expect(service.botUsernameFor({ type: 'SANDBOX' } as any)).toBeUndefined();

    await jest.advanceTimersByTimeAsync(2_000);
    expect(getMe).toHaveBeenCalledTimes(2);
    expect(service.botUsernameFor({ type: 'SANDBOX' } as any)).toBe('sandbox_bot');
    service.onModuleDestroy();
  });
});
