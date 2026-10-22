import { createHmac, timingSafeEqual } from 'crypto';
import { WebhookSignatureError } from './errors';
import type { WebhookEvent } from './types';

/**
 * Checks an `x-telenotify-signature` header (`t=<unix>,v1=<hex>`) against the raw
 * request body. Pass the body exactly as received, before JSON parsing.
 */
export function verifySignature(rawBody: string | Buffer, header: string | null | undefined, secret: string, toleranceSeconds = 300): boolean {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]));
  const timestamp = Number(parts.t);
  if (!parts.v1 || !Number.isFinite(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds) return false;
  const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
  const expected = createHmac('sha256', secret).update(`${parts.t}.${body}`).digest('hex');
  const a = Buffer.from(parts.v1);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Verifies the signature and returns the parsed event, or throws WebhookSignatureError. */
export function constructEvent<T = Record<string, unknown>>(rawBody: string | Buffer, header: string | null | undefined, secret: string, toleranceSeconds?: number): WebhookEvent<T> {
  if (!verifySignature(rawBody, header, secret, toleranceSeconds)) {
    throw new WebhookSignatureError('Invalid or expired Telenotify webhook signature');
  }
  return JSON.parse(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8')) as WebhookEvent<T>;
}
