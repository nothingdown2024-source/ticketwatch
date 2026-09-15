import { createHash } from 'node:crypto';

const TRACKING_PARAMETERS = new Set([
  'fbclid',
  'gclid',
  'dclid',
  'msclkid',
  'mc_cid',
  'mc_eid',
  'ref_src',
]);

export function canonicalizeGenericUrl(input: URL): URL {
  const result = new URL(input.toString());
  result.hash = '';
  result.hostname = result.hostname.toLowerCase();
  if (
    (result.protocol === 'https:' && result.port === '443') ||
    (result.protocol === 'http:' && result.port === '80')
  ) {
    result.port = '';
  }
  const entries = [...result.searchParams.entries()]
    .filter(
      ([key]) =>
        !key.toLowerCase().startsWith('utm_') && !TRACKING_PARAMETERS.has(key.toLowerCase()),
    )
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey === rightKey ? leftValue.localeCompare(rightValue) : leftKey.localeCompare(rightKey),
    );
  result.search = '';
  for (const [key, value] of entries) result.searchParams.append(key, value);
  return result;
}

export function sourceFingerprint(url: URL, adapterId: string): string {
  return createHash('sha256').update(`${adapterId}:${url.toString()}`).digest('hex');
}
