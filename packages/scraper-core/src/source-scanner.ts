import { performance } from 'node:perf_hooks';
import { contentFingerprint, ScanError } from '@ticketwatch/shared';
import type { TicketSourceAdapter, SourceScanResult } from './contracts.js';

export async function scanHtml(
  adapter: TicketSourceAdapter,
  sourceUrl: string,
  html: string,
  detectedAt = new Date(),
): Promise<SourceScanResult> {
  const startedAt = performance.now();
  const extracted = await adapter.extract({ sourceUrl, html, detectedAt });
  if (!adapter.validateResult(extracted)) {
    throw new ScanError('PARSER_FAILED', 'The adapter could not validate the page content.', false);
  }
  const listings = adapter.normalize(extracted);
  return {
    adapterId: adapter.id,
    scanMode: 'HTTP',
    sourceTitle: extracted.sourceTitle,
    listings,
    warnings: extracted.warnings,
    contentHash: contentFingerprint(listings),
    durationMs: Math.round(performance.now() - startedAt),
  };
}
