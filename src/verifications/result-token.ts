import { createHmac, timingSafeEqual } from 'crypto';

/**
 * What the hosted verify page hands back to the developer's site. It's signed with
 * the environment's signing secret (the same one as webhooks), so a browser can't
 * forge "verified"; the developer checks it on their server.
 *
 * Format: base64url(JSON payload) + "." + base64url(HMAC-SHA256(secret, payload part)).
 */
export interface VerificationResult {
  id: string;
  status: 'VERIFIED' | 'FAILED';
  phone: string | null;
  reason: string | null;
  environment: 'sandbox' | 'live';
  /** Issued at, seconds since epoch. */
  iat: number;
  /** Expires at, seconds since epoch. */
  exp: number;
}

const TTL_SECONDS = 10 * 60;
const b64 = (input: Buffer | string) => Buffer.from(input).toString('base64url');

export function signResult(result: Omit<VerificationResult, 'iat' | 'exp'>, secret: string, now = Date.now()): string {
  const iat = Math.floor(now / 1000);
  const payload = b64(JSON.stringify({ ...result, iat, exp: iat + TTL_SECONDS }));
  return `${payload}.${b64(createHmac('sha256', secret).update(payload).digest())}`;
}

/** Returns the result when the token is authentic and not expired, otherwise null. */
export function verifyResult(token: string, secret: string, now = Date.now()): VerificationResult | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = createHmac('sha256', secret).update(payload).digest();
  const given = Buffer.from(signature, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const result = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as VerificationResult;
    return result.exp * 1000 > now ? result : null;
  } catch {
    return null;
  }
}
