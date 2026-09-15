import { describe, expect, it } from 'vitest';
import { SafeUrlService, canonicalizeGenericUrl, safeUrlInternals } from '../src/index.js';

describe('SafeUrlService policy', () => {
  const service = new SafeUrlService({
    allowedHosts: ['example.com'],
    genericScanningEnabled: false,
  });

  it.each([
    'file:///etc/passwd',
    'ftp://example.com/file',
    'http://localhost/admin',
    'http://127.0.0.1/admin',
    'http://[::1]/admin',
    'http://169.254.169.254/latest/meta-data',
    'https://user:pass@example.com',
    'https://example.com:8443',
  ])('rejects unsafe URL %s', async (url) => {
    await expect(service.validate(url)).rejects.toMatchObject({ code: 'SECURITY_REJECTED' });
  });

  it('rejects unsupported hosts before fetching', async () => {
    await expect(service.validate('https://not-supported.invalid')).rejects.toMatchObject({
      code: 'UNSUPPORTED_SOURCE',
    });
  });

  it.each(['10.0.0.1', '172.16.0.1', '192.168.1.1', '0.0.0.0', '224.0.0.1', 'fc00::1', 'fe80::1'])(
    'classifies %s as non-public',
    (address) => expect(safeUrlInternals.isPublicAddress(address)).toBe(false),
  );
});

describe('generic URL canonicalization', () => {
  it('removes tracking but preserves and sorts semantic query parameters', () => {
    const result = canonicalizeGenericUrl(
      new URL('HTTPS://EXAMPLE.COM:443/movies?utm_source=x&city=hyd&date=2026-12-01&gclid=y#shows'),
    );
    expect(result.toString()).toBe('https://example.com/movies?city=hyd&date=2026-12-01');
  });
});
