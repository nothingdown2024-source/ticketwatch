import type { ExtractionResult, NormalizedListing, ScanMode } from '@ticketwatch/shared';

export interface ExtractionContext {
  sourceUrl: string;
  html: string;
  detectedAt: Date;
}

export interface TicketSourceAdapter {
  readonly id: string;
  readonly displayName: string;
  readonly supportedHosts: readonly string[];
  readonly minimumIntervalSeconds: number;
  detect(url: URL): boolean;
  canonicalize(url: URL): URL;
  getScanMode(): ScanMode;
  extract(context: ExtractionContext): Promise<ExtractionResult>;
  normalize(result: ExtractionResult): NormalizedListing[];
  validateResult(result: ExtractionResult): boolean;
}

export interface SourceScanResult {
  adapterId: string;
  scanMode: Exclude<ScanMode, 'AUTO'>;
  sourceTitle: string | null;
  listings: NormalizedListing[];
  warnings: string[];
  contentHash: string;
  durationMs: number;
}
