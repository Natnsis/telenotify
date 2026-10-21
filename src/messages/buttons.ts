import { BadRequestException } from '@nestjs/common';
import { InlineButton } from '../telegram/telegram-api.client';

const MAX_ROWS = 8;
const MAX_PER_ROW = 4;

export function validateButtons(buttons: unknown): InlineButton[][] | undefined {
  if (buttons === undefined || buttons === null) return undefined;
  const fail = (reason: string) => {
    throw new BadRequestException(`buttons: ${reason}`);
  };
  if (!Array.isArray(buttons) || buttons.length > MAX_ROWS) fail(`must be an array of at most ${MAX_ROWS} rows`);
  for (const row of buttons as unknown[]) {
    if (!Array.isArray(row) || row.length === 0 || row.length > MAX_PER_ROW) {
      fail(`each row must have 1-${MAX_PER_ROW} buttons`);
    }
    for (const button of row as Record<string, unknown>[]) {
      if (typeof button?.text !== 'string' || !button.text || button.text.length > 64) {
        fail('each button needs text (1-64 chars)');
      }
      if (typeof button.url !== 'string' || !/^(https?|tg):\/\//.test(button.url)) {
        fail('each button needs an http(s) or tg:// url');
      }
    }
  }
  return (buttons as InlineButton[][]).map((row) => row.map(({ text, url }) => ({ text, url })));
}
