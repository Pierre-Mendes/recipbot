import { lookup } from 'node:dns/promises';
import { SsrfGuardService } from './ssrf-guard.service';
import { SsrfBlockedException } from './exceptions/ssrf-blocked.exception';

jest.mock('node:dns/promises', () => ({
  lookup: jest.fn(),
}));

const mockedLookup = lookup as jest.MockedFunction<typeof lookup>;

describe('SsrfGuardService', () => {
  let guard: SsrfGuardService;

  beforeEach(() => {
    guard = new SsrfGuardService();
    mockedLookup.mockReset();
  });

  it('rejects malformed URLs', async () => {
    await expect(guard.assertSafeUrl('not a url')).rejects.toThrow(
      SsrfBlockedException,
    );
  });

  it.each([
    'ftp://example.com/file',
    'file:///etc/passwd',
    'gopher://example.com',
  ])('rejects non-http(s) schemes (%s)', async (url) => {
    await expect(guard.assertSafeUrl(url)).rejects.toThrow(
      SsrfBlockedException,
    );
  });

  it('rejects blocked hostnames without doing a DNS lookup', async () => {
    await expect(guard.assertSafeUrl('http://localhost:8080')).rejects.toThrow(
      SsrfBlockedException,
    );
    expect(mockedLookup).not.toHaveBeenCalled();
  });

  it('rejects private IPv4 literals directly', async () => {
    await expect(guard.assertSafeUrl('http://127.0.0.1/admin')).rejects.toThrow(
      SsrfBlockedException,
    );
    await expect(
      guard.assertSafeUrl('http://169.254.169.254/latest/meta-data'),
    ).rejects.toThrow(SsrfBlockedException);
    expect(mockedLookup).not.toHaveBeenCalled();
  });

  it('allows public IP literals directly', async () => {
    const url = await guard.assertSafeUrl('http://93.184.216.34/recipe');
    expect(url.hostname).toBe('93.184.216.34');
    expect(mockedLookup).not.toHaveBeenCalled();
  });

  it('rejects a hostname that resolves to a private IP (DNS rebinding)', async () => {
    mockedLookup.mockResolvedValue([
      { address: '10.0.0.5', family: 4 },
    ] as never);

    await expect(
      guard.assertSafeUrl('https://sneaky.example.com/recipe'),
    ).rejects.toThrow(SsrfBlockedException);
  });

  it('rejects when any of multiple resolved addresses is private', async () => {
    mockedLookup.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ] as never);

    await expect(
      guard.assertSafeUrl('https://mixed.example.com/recipe'),
    ).rejects.toThrow(SsrfBlockedException);
  });

  it('allows a hostname that resolves only to public addresses', async () => {
    mockedLookup.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
    ] as never);

    const url = await guard.assertSafeUrl('https://example.com/recipe');
    expect(url.toString()).toBe('https://example.com/recipe');
  });

  it('rejects when DNS resolution fails', async () => {
    mockedLookup.mockRejectedValue(new Error('ENOTFOUND'));

    await expect(
      guard.assertSafeUrl('https://does-not-exist.invalid/recipe'),
    ).rejects.toThrow(SsrfBlockedException);
  });

  it('rejects when DNS resolution returns no addresses', async () => {
    mockedLookup.mockResolvedValue([] as never);

    await expect(
      guard.assertSafeUrl('https://empty-answer.example.com/recipe'),
    ).rejects.toThrow(SsrfBlockedException);
  });
});
