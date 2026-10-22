import { AfroMessageError, sendAfroMessage, toAfroMessageNumber } from './afromessage.client';
import { smsText, SmsFallbackService } from './sms-fallback.service';

const json = (status: number, body: unknown) => async () => new Response(JSON.stringify(body), { status });

describe('sendAfroMessage', () => {
  it('posts with the bearer token, identifier and sender', async () => {
    const fetch = jest.fn(json(200, { acknowledge: 'success', response: { message_id: 'afro-1' } }));
    const result = await sendAfroMessage({ token: 'tok', identifierId: 'id-1', senderName: 'Mela' }, '+251911223344', 'hi', fetch as any);
    expect(result).toEqual({ messageId: 'afro-1' });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.afromessage.com/api/send');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body as string)).toEqual({ to: '+251911223344', message: 'hi', from: 'id-1', sender: 'Mela' });
  });

  it('treats acknowledge "error" as a non-retryable rejection', async () => {
    const fetch = json(200, { acknowledge: 'error', response: { errors: ['Insufficient balance'] } });
    await expect(sendAfroMessage({ token: 't' }, '+251911223344', 'hi', fetch as any)).rejects.toMatchObject({ retryable: false, message: expect.stringContaining('Insufficient balance') });
  });

  it('retries 5xx and network errors', async () => {
    await expect(sendAfroMessage({ token: 't' }, '+2519', 'hi', json(502, {}) as any)).rejects.toMatchObject({ retryable: true });
    const down = async () => {
      throw new TypeError('fetch failed');
    };
    await expect(sendAfroMessage({ token: 't' }, '+2519', 'hi', down as any)).rejects.toBeInstanceOf(AfroMessageError);
  });

  it('formats numbers with a leading +', () => {
    expect(toAfroMessageNumber('251911223344')).toBe('+251911223344');
  });
});

describe('smsText', () => {
  it('writes URL buttons out as lines', () => {
    expect(smsText({ text: 'Loan approved', buttons: [[{ text: 'View', url: 'https://m.test/1' }]] as any })).toBe('Loan approved\nView: https://m.test/1');
  });
});

describe('SmsFallbackService.trigger', () => {
  function setup(environment: object, customer: object, message: object = {}) {
    const msg = { id: 'msg-1', smsFallback: true, fallbackStatus: null, customer, ...message };
    const prisma = { message: { update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...msg, ...data })) } };
    const queue = { add: jest.fn() };
    const service = new SmsFallbackService(prisma as any, {} as any, { emit: jest.fn() } as any, {} as any, queue as any);
    return { run: () => service.trigger({ id: 'env-1', ...environment } as any, msg as any), prisma, queue };
  }
  const live = { type: 'LIVE', smsFallbackEnabled: true, afroTokenEncrypted: 'enc' };

  it('queues an SMS when fallback is on and the customer has a phone', async () => {
    const { run, queue } = setup(live, { phone: '251911223344' });
    expect(await run()).toMatchObject({ fallbackStatus: 'QUEUED' });
    expect(queue.add).toHaveBeenCalledWith('send', { messageId: 'msg-1' }, { jobId: 'fallback_msg-1' });
  });

  it('records SKIPPED when there is no phone number', async () => {
    const { run, queue } = setup(live, { phone: null });
    expect(await run()).toMatchObject({ fallbackStatus: 'SKIPPED' });
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('does nothing when off, opted out, or live without a token', async () => {
    for (const [env, message] of [
      [{ ...live, smsFallbackEnabled: false }, {}],
      [live, { smsFallback: false }],
      [{ ...live, afroTokenEncrypted: null }, {}],
    ] as const) {
      const { run, prisma } = setup(env, { phone: '251911223344' }, message);
      expect((await run()).fallbackStatus).toBeNull();
      expect(prisma.message.update).not.toHaveBeenCalled();
    }
  });
});
