import { createHmac, timingSafeEqual } from 'crypto';
import type { VerificationResult } from './types';

/**
 * Checks the token from the Verify widget ("verified" event) or the hosted page
 * (?telenotify_token=…) with your signing secret. Returns the result when it's
 * authentic and not expired (10 minutes), otherwise null. Never trust it unchecked.
 */
export function verifyToken(token: string | null | undefined, signingSecret: string, now = Date.now()): VerificationResult | null {
  if (!token || !signingSecret) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = createHmac('sha256', signingSecret).update(payload).digest();
  const given = Buffer.from(signature, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const result = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as VerificationResult;
    return result.exp * 1000 > now ? result : null;
  } catch {
    return null;
  }
}
