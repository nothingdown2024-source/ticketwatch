export const SOURCE_STATUSES = [
  'ACTIVE',
  'PAUSED',
  'UNSUPPORTED',
  'BLOCKED',
  'RATE_LIMITED',
  'ADAPTER_BROKEN',
  'DISABLED',
] as const;
export type SourceStatus = (typeof SOURCE_STATUSES)[number];

export type MonitorStatus = 'ACTIVE' | 'PAUSED' | 'CLAIMED' | 'DISABLED';
export type ScanStatus = 'RUNNING' | 'SUCCEEDED' | 'FAILED';
export type ScanMode = 'HTTP' | 'BROWSER' | 'AUTO';
export type MatchMode = 'EXACT' | 'CONTAINS' | 'ALIASES' | 'FUZZY';
export type WatchStatus =
  | 'PENDING'
  | 'SEARCHING'
  | 'AVAILABLE'
  | 'NOTIFIED'
  | 'PAUSED'
  | 'ERROR'
  | 'DISABLED';
export type AvailabilityStatus = 'UNKNOWN' | 'NOT_AVAILABLE' | 'AVAILABLE';
export type NotificationStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED'
  | 'CANCELLED';
export type NotificationChannel = 'CONSOLE' | 'WHATSAPP' | 'EMAIL' | 'TELEGRAM' | 'PUSH';
export type UserRole = 'USER' | 'ADMIN';

export const SCAN_ERROR_CODES = [
  'DNS_ERROR',
  'CONNECTION_TIMEOUT',
  'HTTP_TIMEOUT',
  'HTTP_4XX',
  'HTTP_5XX',
  'RATE_LIMITED',
  'BLOCKED',
  'CONTENT_TOO_LARGE',
  'INVALID_CONTENT',
  'PARSER_FAILED',
  'BROWSER_FAILED',
  'ADAPTER_FAILED',
  'UNSUPPORTED_SOURCE',
  'SECURITY_REJECTED',
] as const;
export type ScanErrorCode = (typeof SCAN_ERROR_CODES)[number];

export interface NormalizedListing {
  title: string;
  normalizedTitle: string;
  aliases: string[];
  language: string | null;
  format: string | null;
  cinemaName: string | null;
  locationName: string | null;
  showDate: string | null;
  showTime: string | null;
  bookingStatus: AvailabilityStatus;
  bookingUrl: string | null;
  sourceUrl: string;
  externalId: string | null;
  detectedAt: string;
  metadata: Readonly<Record<string, unknown>>;
}

export interface ExtractionResult {
  sourceTitle: string | null;
  listings: NormalizedListing[];
  warnings: string[];
}

export interface MatchResult {
  matched: boolean;
  score: number;
  matchedAgainst: string | null;
  reason: string;
}
