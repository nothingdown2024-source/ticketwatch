import { createHash } from 'node:crypto';
import type { NormalizedListing } from './types.js';

function canonicalListing(listing: NormalizedListing): Record<string, unknown> {
  return {
    aliases: [...listing.aliases].sort(),
    bookingStatus: listing.bookingStatus,
    bookingUrl: listing.bookingUrl,
    cinemaName: listing.cinemaName,
    externalId: listing.externalId,
    format: listing.format,
    language: listing.language,
    locationName: listing.locationName,
    normalizedTitle: listing.normalizedTitle,
    showDate: listing.showDate,
    showTime: listing.showTime,
    sourceUrl: listing.sourceUrl,
    title: listing.title,
  };
}

export function contentFingerprint(listings: readonly NormalizedListing[]): string {
  const canonical = listings
    .map(canonicalListing)
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

export function notificationIdempotencyKey(
  watchRuleId: string,
  eventType: string,
  availabilityOccurrenceId: string,
): string {
  const canonical = `${watchRuleId}:${eventType}:${availabilityOccurrenceId}`;
  return createHash('sha256').update(canonical).digest('hex');
}
