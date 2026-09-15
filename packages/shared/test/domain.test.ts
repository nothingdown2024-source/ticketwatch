import { describe, expect, it } from 'vitest';
import {
  contentFingerprint,
  matchListing,
  normalizeTitle,
  notificationIdempotencyKey,
  transitionWatch,
  type NormalizedListing,
} from '../src/index.js';

const avatar: NormalizedListing = {
  title: 'Avatar: Fire and Ash',
  normalizedTitle: 'avatar fire and ash',
  aliases: ['Avatar 3'],
  language: 'English',
  format: 'IMAX',
  cinemaName: 'Demo Cinema',
  locationName: 'Demo City',
  showDate: null,
  showTime: null,
  bookingStatus: 'AVAILABLE',
  bookingUrl: 'https://demo.ticketwatch.local/book/avatar',
  sourceUrl: 'https://demo.ticketwatch.local/cinema/1',
  externalId: 'avatar',
  detectedAt: '2026-09-15T00:00:00.000Z',
  metadata: {},
};

describe('title normalization', () => {
  it.each([
    ['AVENGERS: SECRET WARS', 'avengers secret wars'],
    ['  Avatar—Fire  and Ash ', 'avatar fire and ash'],
    ['Movie – Part-II', 'movie part ii'],
    ['ＭＯＶＩＥ', 'movie'],
  ])('normalizes %s', (input, expected) => expect(normalizeTitle(input)).toBe(expected));
});

describe('matching', () => {
  it('matches punctuation-insensitive exact titles', () => {
    expect(matchListing({ query: 'Avatar - Fire and Ash', mode: 'EXACT' }, avatar).matched).toBe(
      true,
    );
  });

  it('matches configured aliases', () => {
    expect(
      matchListing({ query: 'The Avatar sequel', aliases: ['Avatar 3'], mode: 'ALIASES' }, avatar),
    ).toMatchObject({ matched: true, reason: 'exact-title' });
  });

  it('supports safe contains matching', () => {
    expect(matchListing({ query: 'Fire and Ash', mode: 'CONTAINS' }, avatar).matched).toBe(true);
  });

  it('rejects dangerously short contains queries', () => {
    expect(matchListing({ query: 'ash', mode: 'CONTAINS' }, avatar).matched).toBe(false);
  });

  it('keeps fuzzy matching behind a threshold', () => {
    expect(matchListing({ query: 'Avatr Fire and Ash', mode: 'FUZZY' }, avatar).matched).toBe(true);
    expect(matchListing({ query: 'War Two', mode: 'FUZZY' }, avatar).matched).toBe(false);
  });
});

describe('watch state transitions', () => {
  const searching = { status: 'SEARCHING', availability: 'NOT_AVAILABLE', occurrence: 0 } as const;

  it('emits once when availability opens', () => {
    const first = transitionWatch(searching, { kind: 'MATCHED' });
    expect(first).toMatchObject({ availabilityOpened: true, next: { occurrence: 1 } });
    expect(transitionWatch(first.next, { kind: 'MATCHED' })).toMatchObject({
      availabilityOpened: false,
      next: { occurrence: 1 },
    });
  });

  it('does not interpret scan failure as unavailability', () => {
    const available = { status: 'AVAILABLE', availability: 'AVAILABLE', occurrence: 1 } as const;
    const failed = transitionWatch(available, { kind: 'SCAN_FAILED', errorCode: 'HTTP_TIMEOUT' });
    expect(failed.next.availability).toBe('AVAILABLE');
    expect(failed.availabilityClosed).toBe(false);
  });

  it('can close and open a new occurrence', () => {
    const opened = transitionWatch(searching, { kind: 'MATCHED' });
    const closed = transitionWatch(opened.next, { kind: 'NOT_MATCHED' });
    const reopened = transitionWatch(closed.next, { kind: 'MATCHED' });
    expect(reopened.next.occurrence).toBe(2);
  });
});

describe('deterministic identity', () => {
  it('hashes equivalent listing order identically', () => {
    const other = { ...avatar, title: 'Coolie', normalizedTitle: 'coolie', externalId: 'coolie' };
    expect(contentFingerprint([avatar, other])).toBe(contentFingerprint([other, avatar]));
  });

  it('creates stable, occurrence-specific notification keys', () => {
    const first = notificationIdempotencyKey('watch-1', 'AVAILABILITY_OPENED', 'occurrence-1');
    expect(first).toBe(
      notificationIdempotencyKey('watch-1', 'AVAILABILITY_OPENED', 'occurrence-1'),
    );
    expect(first).not.toBe(
      notificationIdempotencyKey('watch-1', 'AVAILABILITY_OPENED', 'occurrence-2'),
    );
  });
});
