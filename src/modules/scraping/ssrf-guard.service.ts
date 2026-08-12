import { Injectable } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import {
  isBlockedHostname,
  isIpLiteral,
  isPrivateOrReservedIp,
} from '../../common/security/ip-range.util';
import { SsrfBlockedException } from './exceptions/ssrf-blocked.exception';

/**
 * Runtime SSRF guard for the scraping module. Unlike the DTO-time
 * `IsPublicHttpUrl` validator, this resolves the hostname and checks the
 * *actual* IP(s) it points to — closing the DNS-rebinding gap where a
 * hostname looks public at validation time but resolves to an internal
 * address by the time it's fetched. Must be called again for every
 * redirect hop, not just the original URL.
 */
@Injectable()
export class SsrfGuardService {
  async assertSafeUrl(rawUrl: string): Promise<URL> {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new SsrfBlockedException('not a valid URL');
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new SsrfBlockedException('only http/https URLs are allowed');
    }

    const hostname = url.hostname.toLowerCase();

    if (isBlockedHostname(hostname)) {
      throw new SsrfBlockedException(`blocked hostname "${hostname}"`);
    }

    if (isIpLiteral(hostname)) {
      if (isPrivateOrReservedIp(hostname)) {
        throw new SsrfBlockedException(
          `"${hostname}" resolves to a private/reserved IP`,
        );
      }
      return url;
    }

    let resolved: { address: string }[];
    try {
      resolved = await lookup(hostname, { all: true });
    } catch {
      throw new SsrfBlockedException(`could not resolve host "${hostname}"`);
    }

    if (resolved.length === 0) {
      throw new SsrfBlockedException(`host "${hostname}" did not resolve`);
    }

    for (const { address } of resolved) {
      if (isPrivateOrReservedIp(address)) {
        throw new SsrfBlockedException(
          `"${hostname}" resolves to a private/reserved IP (${address})`,
        );
      }
    }

    return url;
  }
}
