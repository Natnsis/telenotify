import { lookup as dnsLookup, LookupAddress } from 'dns';
import { BlockList, isIP } from 'net';
import { Agent } from 'undici';

// Addresses a customer-supplied webhook URL must never reach: loopback, private
// networks, link-local (cloud metadata), CGNAT, multicast and reserved ranges.
const blocked = new BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) {
  blocked.addSubnet(network, prefix, 'ipv4');
}
for (const [network, prefix] of [
  ['::', 128], ['::1', 128], ['64:ff9b::', 96], ['100::', 64], ['2001:db8::', 32],
  ['2002::', 16], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8],
] as const) {
  blocked.addSubnet(network, prefix, 'ipv6');
}

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !blocked.check(address, 'ipv4');
  if (family === 6) {
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
    if (mapped) return isPublicAddress(mapped[1]);
    return !blocked.check(address, 'ipv6');
  }
  return false;
}

export class BlockedAddressError extends Error {}

function hostOf(url: URL): string {
  return url.hostname.replace(/^\[|\]$/g, '');
}

// Resolves the URL's host and fails unless every address is public.
export async function assertPublicUrl(url: URL): Promise<void> {
  const host = hostOf(url);
  if (isIP(host)) {
    if (!isPublicAddress(host)) throw new BlockedAddressError(`${host} is a private or reserved address`);
    return;
  }
  const addresses = await new Promise<LookupAddress[]>((resolve, reject) =>
    dnsLookup(host, { all: true }, (error, result) => (error ? reject(error) : resolve(result))),
  );
  const bad = addresses.find((a) => !isPublicAddress(a.address));
  if (bad) throw new BlockedAddressError(`${host} resolves to ${bad.address}, a private or reserved address`);
}

// undici dispatcher that re-checks every address at connect time, so a DNS change
// after validation (rebinding) cannot reach a private address.
export const publicOnlyAgent = new Agent({
  connect: {
    lookup: (hostname, options, callback) => {
      dnsLookup(hostname, { ...options, all: true }, (error, addresses: LookupAddress[]) => {
        if (error) return callback(error, '', 0);
        const bad = addresses.find((a) => !isPublicAddress(a.address));
        if (bad) return callback(new BlockedAddressError(`${hostname} resolves to a private address`), '', 0);
        if ((options as { all?: boolean }).all) return (callback as unknown as (e: null, a: LookupAddress[]) => void)(null, addresses);
        return callback(null, addresses[0].address, addresses[0].family);
      });
    },
  },
});
