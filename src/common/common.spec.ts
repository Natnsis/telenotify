import { randomBytes } from 'crypto';
import { decrypt, encrypt } from './crypto';
import { normalizePhone } from './phone';

describe('normalizePhone', () => {
  it.each([
    ['0911223344', '251911223344'],
    ['+251 911 223 344', '251911223344'],
    ['911223344', '251911223344'],
    ['0711223344', '251711223344'],
    ['+1 (555) 010-0000', '15550100000'],
  ])('%s -> %s', (input, expected) => expect(normalizePhone(input)).toBe(expected));
});

describe('encrypt/decrypt', () => {
  const key = randomBytes(32).toString('base64');

  it('round-trips', () => {
    expect(decrypt(encrypt('123:ABC', key), key)).toBe('123:ABC');
  });

  it('rejects tampered ciphertext', () => {
    const raw = Buffer.from(encrypt('123:ABC', key), 'base64');
    raw[raw.length - 1] ^= 1;
    expect(() => decrypt(raw.toString('base64'), key)).toThrow();
  });

  it('rejects a wrong-size key', () => {
    expect(() => encrypt('x', Buffer.alloc(16).toString('base64'))).toThrow(/32 bytes/);
  });
});

describe('password hashing', () => {
  it('verifies the right password and rejects the wrong one', async () => {
    const { hashPassword, verifyPassword } = await import('./crypto');
    const hash = await hashPassword('correct horse');
    expect(hash).toMatch(/^scrypt\$16384\$/);
    await expect(verifyPassword('correct horse', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong', hash)).resolves.toBe(false);
    await expect(verifyPassword('x', 'garbage')).resolves.toBe(false);
  });
});
