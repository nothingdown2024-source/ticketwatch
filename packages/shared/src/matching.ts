import type { MatchMode, MatchResult, NormalizedListing } from './types.js';
import { normalizeTitle, tokenizeTitle } from './normalization.js';

export interface MatchRequest {
  query: string;
  aliases?: readonly string[];
  mode: MatchMode;
  fuzzyThreshold?: number;
}

function diceCoefficient(left: string, right: string): number {
  if (left === right) return 1;
  if (left.length < 2 || right.length < 2) return 0;
  const pairs = new Map<string, number>();
  for (let index = 0; index < left.length - 1; index += 1) {
    const pair = left.slice(index, index + 2);
    pairs.set(pair, (pairs.get(pair) ?? 0) + 1);
  }
  let overlap = 0;
  for (let index = 0; index < right.length - 1; index += 1) {
    const pair = right.slice(index, index + 2);
    const count = pairs.get(pair) ?? 0;
    if (count > 0) {
      pairs.set(pair, count - 1);
      overlap += 1;
    }
  }
  return (2 * overlap) / (left.length + right.length - 2);
}

function isSafeContains(query: string, candidate: string): boolean {
  const queryTokens = tokenizeTitle(query);
  if (queryTokens.length === 0) return false;
  if (queryTokens.length === 1 && (queryTokens[0]?.length ?? 0) < 4) return false;
  return candidate.includes(query);
}

function compare(
  query: string,
  candidate: string,
  mode: MatchMode,
  threshold: number,
): MatchResult {
  if (query === '' || candidate === '') {
    return { matched: false, score: 0, matchedAgainst: null, reason: 'empty-normalized-title' };
  }
  if (query === candidate) {
    return { matched: true, score: 1, matchedAgainst: candidate, reason: 'exact-title' };
  }
  if ((mode === 'CONTAINS' || mode === 'ALIASES') && isSafeContains(query, candidate)) {
    const score = Math.min(0.99, query.length / candidate.length);
    return { matched: true, score, matchedAgainst: candidate, reason: 'contained-title' };
  }
  if (mode === 'FUZZY') {
    const score = diceCoefficient(query, candidate);
    return {
      matched: score >= threshold,
      score,
      matchedAgainst: score >= threshold ? candidate : null,
      reason: score >= threshold ? 'fuzzy-threshold-met' : 'fuzzy-threshold-not-met',
    };
  }
  return { matched: false, score: 0, matchedAgainst: null, reason: 'no-match' };
}

export function matchListing(request: MatchRequest, listing: NormalizedListing): MatchResult {
  const threshold = Math.max(0.75, Math.min(request.fuzzyThreshold ?? 0.88, 1));
  const candidates = [listing.title, ...listing.aliases].map(normalizeTitle);
  const terms =
    request.mode === 'ALIASES'
      ? [request.query, ...(request.aliases ?? [])].map(normalizeTitle)
      : [normalizeTitle(request.query)];

  let best: MatchResult = { matched: false, score: 0, matchedAgainst: null, reason: 'no-match' };
  for (const term of terms) {
    for (const candidate of candidates) {
      const result = compare(term, candidate, request.mode, threshold);
      if (result.score > best.score || result.matched) best = result;
      if (result.matched) return result;
    }
  }
  return best;
}

export function findBestMatch(
  request: MatchRequest,
  listings: readonly NormalizedListing[],
): { listing: NormalizedListing; result: MatchResult } | null {
  let best: { listing: NormalizedListing; result: MatchResult } | null = null;
  for (const listing of listings) {
    const result = matchListing(request, listing);
    if (result.matched && (best === null || result.score > best.result.score)) {
      best = { listing, result };
    }
  }
  return best;
}
