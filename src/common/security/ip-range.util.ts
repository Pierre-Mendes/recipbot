/**
 * Shared SSRF building blocks. Used two ways:
 *  - DTO-time (is-public-http-url.validator.ts): syntactic check against a
 *    literal hostname/IP the user typed, before anything is fetched.
 *  - Fetch-time (modules/scraping): checked again against every IP a
 *    hostname *actually* resolves to, and again on every redirect hop,
 *    because a hostname can pass the literal check and still resolve to
 *    an internal address (DNS rebinding) or redirect somewhere internal.
 */

export const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '0.0.0.0',
  '::1',
  'metadata.google.internal',
]);

export function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return (
    BLOCKED_HOSTNAMES.has(lower) ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal')
  );
}

export function isIpLiteral(hostname: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':');
}

export function isPrivateOrReservedIpv4(ip: string): boolean {
  const octets = ip.split('.').map(Number);
  if (
    octets.length !== 4 ||
    octets.some((n) => Number.isNaN(n) || n < 0 || n > 255)
  ) {
    // Malformed input is treated as unsafe rather than silently allowed.
    return true;
  }
  const [a, b] = octets;

  if (a === 127) return true; // loopback
  if (a === 10) return true; // private
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 169 && b === 254) return true; // link-local / cloud metadata
  if (a === 0) return true; // "this" network
  if (a >= 224) return true; // multicast/reserved

  return false;
}

export function isPrivateOrReservedIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();

  if (lower === '::1' || lower === '::') return true; // loopback / unspecified
  if (lower.startsWith('fe80:')) return true; // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local (fc00::/7)

  // IPv4-mapped/compatible addresses (::ffff:a.b.c.d) must be checked
  // against the embedded IPv4 rules, not treated as opaque IPv6.
  const mapped = lower.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) {
    return isPrivateOrReservedIpv4(mapped[1]);
  }

  return false;
}

export function isPrivateOrReservedIp(hostname: string): boolean {
  if (hostname.includes(':')) {
    return isPrivateOrReservedIpv6(hostname);
  }
  return isPrivateOrReservedIpv4(hostname);
}
