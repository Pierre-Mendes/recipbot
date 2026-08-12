import { Injectable, Logger } from '@nestjs/common';
import {
  ALLOWED_CONTENT_TYPES,
  FETCH_TIMEOUT_MS,
  MAX_REDIRECTS,
  MAX_RESPONSE_BYTES,
  SCRAPER_USER_AGENT,
} from './scraping.constants';
import { SsrfGuardService } from './ssrf-guard.service';
import { ScrapingFailedException } from './exceptions/scraping-failed.exception';
import {
  extractPageContent,
  ExtractedPageContent,
} from './html-extractor.util';

export interface ScrapedPageResult extends ExtractedPageContent {
  sourceUrl: string;
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

@Injectable()
export class ScrapingService {
  private readonly logger = new Logger(ScrapingService.name);

  constructor(private readonly ssrfGuard: SsrfGuardService) {}

  async scrapeUrl(rawUrl: string): Promise<ScrapedPageResult> {
    let currentUrl = await this.ssrfGuard.assertSafeUrl(rawUrl);

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const response = await this.fetchOnce(currentUrl);

      if (REDIRECT_STATUSES.has(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          throw new ScrapingFailedException('redirect without Location header');
        }
        const nextUrl = new URL(location, currentUrl);
        // Re-validate on every hop: a public URL can redirect to an
        // internal address, which is a classic SSRF bypass.
        currentUrl = await this.ssrfGuard.assertSafeUrl(nextUrl.toString());
        continue;
      }

      if (!response.ok) {
        throw new ScrapingFailedException(
          `upstream returned HTTP ${response.status}`,
        );
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!ALLOWED_CONTENT_TYPES.some((type) => contentType.includes(type))) {
        throw new ScrapingFailedException(
          `unsupported content-type "${contentType}"`,
        );
      }

      const html = await this.readBodyWithLimit(response);
      const content = extractPageContent(html);

      return { sourceUrl: currentUrl.toString(), ...content };
    }

    throw new ScrapingFailedException('too many redirects');
  }

  private async fetchOnce(url: URL): Promise<Response> {
    try {
      return await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          'User-Agent': SCRAPER_USER_AGENT,
          Accept: 'text/html,application/xhtml+xml',
        },
      });
    } catch (error) {
      this.logger.warn(`Fetch failed for ${url.toString()}: ${error}`);
      throw new ScrapingFailedException('network error or timeout');
    }
  }

  private async readBodyWithLimit(response: Response): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) {
      const text = await response.text();
      if (Buffer.byteLength(text, 'utf-8') > MAX_RESPONSE_BYTES) {
        throw new ScrapingFailedException('response too large');
      }
      return text;
    }

    const chunks: Uint8Array[] = [];
    let received = 0;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      received += value.byteLength;
      if (received > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new ScrapingFailedException('response too large');
      }
      chunks.push(value);
    }

    return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString(
      'utf-8',
    );
  }
}
