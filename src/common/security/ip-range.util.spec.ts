import {
  isBlockedHostname,
  isIpLiteral,
  isPrivateOrReservedIp,
  isPrivateOrReservedIpv4,
  isPrivateOrReservedIpv6,
} from './ip-range.util';

describe('ip-range.util', () => {
  describe('isBlockedHostname', () => {
    it('blocks known-sensitive hostnames', () => {
      expect(isBlockedHostname('localhost')).toBe(true);
      expect(isBlockedHostname('LOCALHOST')).toBe(true);
      expect(isBlockedHostname('metadata.google.internal')).toBe(true);
      expect(isBlockedHostname('0.0.0.0')).toBe(true);
    });

    it('blocks .local and .internal TLDs', () => {
      expect(isBlockedHostname('printer.local')).toBe(true);
      expect(isBlockedHostname('service.internal')).toBe(true);
    });

    it('allows ordinary public hostnames', () => {
      expect(isBlockedHostname('example.com')).toBe(false);
      expect(isBlockedHostname('recipes.example.org')).toBe(false);
    });
  });

  describe('isIpLiteral', () => {
    it('detects IPv4 literals', () => {
      expect(isIpLiteral('127.0.0.1')).toBe(true);
    });

    it('detects IPv6 literals', () => {
      expect(isIpLiteral('::1')).toBe(true);
    });

    it('rejects hostnames', () => {
      expect(isIpLiteral('example.com')).toBe(false);
    });
  });

  describe('isPrivateOrReservedIpv4', () => {
    it.each([
      ['127.0.0.1', true],
      ['10.0.0.5', true],
      ['172.16.0.1', true],
      ['172.31.255.255', true],
      ['172.32.0.1', false],
      ['192.168.1.1', true],
      ['169.254.169.254', true], // cloud metadata endpoint
      ['0.0.0.0', true],
      ['224.0.0.1', true],
      ['8.8.8.8', false],
      ['93.184.216.34', false],
    ])('%s -> private=%s', (ip, expected) => {
      expect(isPrivateOrReservedIpv4(ip)).toBe(expected);
    });

    it('treats malformed input as unsafe', () => {
      expect(isPrivateOrReservedIpv4('not-an-ip')).toBe(true);
      expect(isPrivateOrReservedIpv4('1.2.3')).toBe(true);
    });
  });

  describe('isPrivateOrReservedIpv6', () => {
    it.each([
      ['::1', true],
      ['::', true],
      ['fe80::1', true],
      ['fc00::1', true],
      ['fd12:3456:789a::1', true],
      ['::ffff:127.0.0.1', true],
      ['::ffff:8.8.8.8', false],
      ['2001:4860:4860::8888', false],
    ])('%s -> private=%s', (ip, expected) => {
      expect(isPrivateOrReservedIpv6(ip)).toBe(expected);
    });
  });

  describe('isPrivateOrReservedIp', () => {
    it('dispatches by address family', () => {
      expect(isPrivateOrReservedIp('10.0.0.1')).toBe(true);
      expect(isPrivateOrReservedIp('::1')).toBe(true);
      expect(isPrivateOrReservedIp('8.8.8.8')).toBe(false);
    });
  });
});
