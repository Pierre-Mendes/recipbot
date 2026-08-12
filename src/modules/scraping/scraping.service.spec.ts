import { ScrapingService } from './scraping.service';
import { SsrfGuardService } from './ssrf-guard.service';
import { ScrapingFailedException } from './exceptions/scraping-failed.exception';
import { MAX_REDIRECTS, MAX_RESPONSE_BYTES } from './scraping.constants';

function chunkReader(chunks: Uint8Array[]) {
  let index = 0;
  return {
    read: jest.fn(async () => {
      if (index < chunks.length) {
        return { done: false, value: chunks[index++] };
      }
      return { done: true, value: undefined };
    }),
    cancel: jest.fn(async () => undefined),
  };
}

function makeResponse(opts: {
  status: number;
  headers?: Record<string, string>;
  bodyText?: string;
  bodyChunks?: Uint8Array[];
}): Response {
  const headerMap = new Map(
    Object.entries(opts.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]),
  );
  const chunks =
    opts.bodyChunks ??
    (opts.bodyText !== undefined
      ? [new TextEncoder().encode(opts.bodyText)]
      : []);

  return {
    status: opts.status,
    ok: opts.status >= 200 && opts.status < 300,
    headers: {
      get: (name: string) => headerMap.get(name.toLowerCase()) ?? null,
    },
    body: { getReader: () => chunkReader(chunks) },
    text: async () =>
      Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf-8'),
  } as unknown as Response;
}

describe('ScrapingService', () => {
  let ssrfGuard: jest.Mocked<SsrfGuardService>;
  let service: ScrapingService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    ssrfGuard = {
      assertSafeUrl: jest.fn(async (url: string) => new URL(url)),
    } as unknown as jest.Mocked<SsrfGuardService>;
    service = new ScrapingService(ssrfGuard);
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches, validates via the SSRF guard, and extracts page content', async () => {
    fetchMock.mockResolvedValue(
      makeResponse({
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
        bodyText:
          '<html><head><title>Bolo</title></head><body><p>Misture tudo.</p></body></html>',
      }),
    );

    const result = await service.scrapeUrl('https://example.com/recipe');

    expect(ssrfGuard.assertSafeUrl).toHaveBeenCalledWith(
      'https://example.com/recipe',
    );
    expect(result.sourceUrl).toBe('https://example.com/recipe');
    expect(result.title).toBe('Bolo');
    expect(result.text).toContain('Misture tudo.');
  });

  it('follows a redirect, re-validating the target through the SSRF guard', async () => {
    fetchMock
      .mockResolvedValueOnce(
        makeResponse({
          status: 302,
          headers: { location: 'https://example.com/final' },
        }),
      )
      .mockResolvedValueOnce(
        makeResponse({
          status: 200,
          headers: { 'content-type': 'text/html' },
          bodyText: '<html><body>final page</body></html>',
        }),
      );

    const result = await service.scrapeUrl('https://example.com/start');

    expect(ssrfGuard.assertSafeUrl).toHaveBeenNthCalledWith(
      1,
      'https://example.com/start',
    );
    expect(ssrfGuard.assertSafeUrl).toHaveBeenNthCalledWith(
      2,
      'https://example.com/final',
    );
    expect(result.sourceUrl).toBe('https://example.com/final');
  });

  it('throws when a redirect is missing a Location header', async () => {
    fetchMock.mockResolvedValue(makeResponse({ status: 302 }));

    await expect(
      service.scrapeUrl('https://example.com/start'),
    ).rejects.toThrow(ScrapingFailedException);
  });

  it('gives up after too many redirects', async () => {
    fetchMock.mockResolvedValue(
      makeResponse({
        status: 302,
        headers: { location: 'https://example.com/loop' },
      }),
    );

    await expect(
      service.scrapeUrl('https://example.com/start'),
    ).rejects.toThrow(ScrapingFailedException);
    // Initial fetch + MAX_REDIRECTS follow-up fetches.
    expect(fetchMock).toHaveBeenCalledTimes(MAX_REDIRECTS + 1);
  });

  it('throws on a non-2xx response', async () => {
    fetchMock.mockResolvedValue(makeResponse({ status: 404 }));

    await expect(
      service.scrapeUrl('https://example.com/missing'),
    ).rejects.toThrow(ScrapingFailedException);
  });

  it('throws on an unsupported content-type', async () => {
    fetchMock.mockResolvedValue(
      makeResponse({
        status: 200,
        headers: { 'content-type': 'application/json' },
        bodyText: '{}',
      }),
    );

    await expect(service.scrapeUrl('https://example.com/api')).rejects.toThrow(
      ScrapingFailedException,
    );
  });

  it('aborts and throws when the response body exceeds the size cap', async () => {
    const bigChunk = new Uint8Array(MAX_RESPONSE_BYTES + 1);
    fetchMock.mockResolvedValue(
      makeResponse({
        status: 200,
        headers: { 'content-type': 'text/html' },
        bodyChunks: [bigChunk],
      }),
    );

    await expect(service.scrapeUrl('https://example.com/huge')).rejects.toThrow(
      ScrapingFailedException,
    );
  });

  it('falls back to response.text() when body is not a stream', async () => {
    const response = {
      status: 200,
      ok: true,
      headers: {
        get: (name: string) =>
          name.toLowerCase() === 'content-type' ? 'text/html' : null,
      },
      body: undefined,
      text: async () => '<html><body>no stream here</body></html>',
    } as unknown as Response;
    fetchMock.mockResolvedValue(response);

    const result = await service.scrapeUrl('https://example.com/no-stream');
    expect(result.text).toContain('no stream here');
  });

  it('rejects an oversized body from the text() fallback path too', async () => {
    const response = {
      status: 200,
      ok: true,
      headers: {
        get: (name: string) =>
          name.toLowerCase() === 'content-type' ? 'text/html' : null,
      },
      body: undefined,
      text: async () => 'a'.repeat(MAX_RESPONSE_BYTES + 1),
    } as unknown as Response;
    fetchMock.mockResolvedValue(response);

    await expect(
      service.scrapeUrl('https://example.com/no-stream-huge'),
    ).rejects.toThrow(ScrapingFailedException);
  });

  it('wraps network errors from fetch', async () => {
    fetchMock.mockRejectedValue(new Error('timeout'));

    await expect(
      service.scrapeUrl('https://example.com/unreachable'),
    ).rejects.toThrow(ScrapingFailedException);
  });

  it('propagates SSRF rejections without calling fetch', async () => {
    ssrfGuard.assertSafeUrl.mockRejectedValue(new Error('blocked'));

    await expect(service.scrapeUrl('http://127.0.0.1/x')).rejects.toThrow(
      'blocked',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
