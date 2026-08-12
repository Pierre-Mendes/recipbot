import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  isBlockedHostname,
  isIpLiteral,
  isPrivateOrReservedIp,
} from '../security/ip-range.util';

/**
 * Literal-value guard for `source_url`. This blocks the obvious SSRF
 * payloads (localhost, loopback/link-local/private IP literals, cloud
 * metadata hostnames, non-http(s) schemes) at the DTO boundary. It is
 * NOT a substitute for runtime SSRF protection: hostnames that resolve
 * to internal IPs via DNS (rebinding) can only be caught by resolving
 * and checking the address at fetch time — see
 * modules/scraping/ssrf-guard.ts, which re-validates on every redirect hop.
 */
@ValidatorConstraint({ name: 'isPublicHttpUrl', async: false })
export class IsPublicHttpUrlConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }

    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return false;
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }

    const hostname = url.hostname.toLowerCase();

    if (isBlockedHostname(hostname)) {
      return false;
    }

    if (isIpLiteral(hostname) && isPrivateOrReservedIp(hostname)) {
      return false;
    }

    return true;
  }

  defaultMessage(): string {
    return 'source_url must be a public http(s) URL';
  }
}
