import { assertPublicUrl, BlockedAddressError, isPublicAddress } from './network-guard';

describe('isPublicAddress', () => {
  it.each(['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111', '::ffff:8.8.8.8'])('allows %s', (ip) => {
    expect(isPublicAddress(ip)).toBe(true);
  });

  it.each([
    '127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254',
    '100.64.0.1', '0.0.0.0', '224.0.0.1', '::1', '::', 'fe80::1', 'fd00::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1',
  ])('blocks %s', (ip) => {
    expect(isPublicAddress(ip)).toBe(false);
  });

  it('rejects non-IP strings', () => {
    expect(isPublicAddress('localhost')).toBe(false);
  });
});

describe('assertPublicUrl', () => {
  it.each(['http://127.0.0.1/hook', 'http://[::1]:8080/hook', 'https://169.254.169.254/latest/meta-data'])('blocks %s', async (url) => {
    await expect(assertPublicUrl(new URL(url))).rejects.toBeInstanceOf(BlockedAddressError);
  });

  it('blocks hostnames that resolve to loopback', async () => {
    await expect(assertPublicUrl(new URL('http://localhost:3000/hook'))).rejects.toBeInstanceOf(BlockedAddressError);
  });

  it('allows a public IP literal', async () => {
    await expect(assertPublicUrl(new URL('https://8.8.8.8/hook'))).resolves.toBeUndefined();
  });
});
