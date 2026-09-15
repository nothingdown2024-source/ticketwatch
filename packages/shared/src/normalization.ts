const SEPARATOR_PATTERN = /[:\-\u2012\u2013\u2014\u2015_/\\|]+/gu;
const PUNCTUATION_PATTERN = /[!"#$%&'()*+,.;<=>?@[\]^`{}~]/gu;

export function normalizeTitle(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en')
    .replace(SEPARATOR_PATTERN, ' ')
    .replace(PUNCTUATION_PATTERN, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function tokenizeTitle(value: string): string[] {
  const normalized = normalizeTitle(value);
  return normalized === '' ? [] : normalized.split(' ');
}
