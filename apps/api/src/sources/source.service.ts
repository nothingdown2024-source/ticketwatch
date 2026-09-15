import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@ticketwatch/database';
import {
  AdapterRegistry,
  DemoAdapter,
  GenericAdapter,
  SafeUrlService,
  loadDemoFixture,
  scanHtml,
  sourceFingerprint,
} from '@ticketwatch/scraper-core';
import { PRISMA } from '../tokens.js';

export interface SourcePreview {
  supported: boolean;
  adapter: { id: string; displayName: string };
  normalizedUrl: string;
  fingerprint: string;
  detectedTitle: string | null;
  listings: Array<{
    title: string;
    language: string | null;
    format: string | null;
    bookingStatus: string;
    bookingUrl: string | null;
  }>;
  scanMode: string;
  warnings: string[];
}

@Injectable()
export class SourceService {
  private readonly demo = new DemoAdapter();
  private readonly registry: AdapterRegistry;
  private readonly safeUrl: SafeUrlService;

  public constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {
    const genericEnabled = process.env.GENERIC_SCANNING_ENABLED === 'true';
    this.registry = new AdapterRegistry([this.demo, new GenericAdapter()], genericEnabled);
    this.safeUrl = new SafeUrlService({
      allowedHosts: (process.env.ALLOWED_SOURCE_HOSTS ?? 'demo.ticketwatch.local')
        .split(',')
        .map((host) => host.trim()),
      genericScanningEnabled: genericEnabled,
    });
  }

  public async preview(rawUrl: string): Promise<SourcePreview> {
    const url = new URL(rawUrl);
    const adapter = this.registry.detect(url);
    const normalized = adapter.canonicalize(url);
    if (adapter.id !== 'demo') await this.safeUrl.validate(normalized.toString());
    const result =
      adapter.id === 'demo'
        ? await scanHtml(adapter, normalized.toString(), await loadDemoFixture('state-1'))
        : {
            adapterId: adapter.id,
            scanMode: 'HTTP' as const,
            sourceTitle: null,
            listings: [],
            warnings: ['Live generic previews are not enabled in this milestone.'],
            contentHash: '',
            durationMs: 0,
          };
    return {
      supported: adapter.id === 'demo',
      adapter: { id: adapter.id, displayName: adapter.displayName },
      normalizedUrl: normalized.toString(),
      fingerprint: sourceFingerprint(normalized, adapter.id),
      detectedTitle: result.sourceTitle,
      listings: result.listings.map((listing) => ({
        title: listing.title,
        language: listing.language,
        format: listing.format,
        bookingStatus: listing.bookingStatus,
        bookingUrl: listing.bookingUrl,
      })),
      scanMode: result.scanMode,
      warnings: result.warnings,
    };
  }

  public async setDemoFixture(
    sourceId: string,
    userId: string,
    fixtureState: 'state-1' | 'state-2',
  ): Promise<void> {
    const owned = await this.prisma.watchRule.count({
      where: { sourceId, userId, deletedAt: null },
    });
    if (owned === 0) throw new Error('Source not found.');
    await this.prisma.sourceAdapterConfig.update({
      where: { sourceId },
      data: { config: { fixtureState } },
    });
    await this.prisma.sourceMonitor.update({
      where: { sourceId },
      data: { nextCheckAt: new Date() },
    });
  }
}
