import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type PrismaClient, type WatchState } from '@ticketwatch/database';
import {
  DemoAdapter,
  loadDemoFixture,
  scanHtml,
  type DemoFixtureState,
} from '@ticketwatch/scraper-core';
import {
  findBestMatch,
  notificationIdempotencyKey,
  ScanError,
  transitionWatch,
  type MatchMode as DomainMatchMode,
  type NormalizedListing,
} from '@ticketwatch/shared';
import { PRISMA } from './tokens.js';

export interface CommittedScanResult {
  scanId: string;
  notificationIds: string[];
  contentHash: string;
}

function readFixtureState(config: Prisma.JsonValue | null): DemoFixtureState {
  if (typeof config !== 'object' || config === null || Array.isArray(config)) return 'state-1';
  return config.fixtureState === 'state-2' ? 'state-2' : 'state-1';
}

function mapState(state: WatchState): {
  status: WatchState['status'];
  availability: WatchState['availability'];
  occurrence: number;
} {
  return {
    status: state.status,
    availability: state.availability,
    occurrence: state.occurrence,
  };
}

function inputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

@Injectable()
export class ScanService {
  private readonly demoAdapter = new DemoAdapter();

  public constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  public async scanSource(
    sourceId: string,
    runKey: string,
    correlationId: string,
  ): Promise<CommittedScanResult> {
    const existing = await this.prisma.scan.findUnique({
      where: { runKey },
      include: { events: { include: { notifications: true } } },
    });
    if (existing?.status === 'SUCCEEDED' && existing.contentHash !== null) {
      return {
        scanId: existing.id,
        contentHash: existing.contentHash,
        notificationIds: existing.events.flatMap(({ notifications }) =>
          notifications.map(({ id }) => id),
        ),
      };
    }

    const source = await this.prisma.source.findUnique({
      where: { id: sourceId },
      include: {
        monitor: true,
        adapterConfig: true,
        watchRules: { where: { deletedAt: null }, include: { aliases: true, state: true } },
      },
    });
    if (source === null || source.status !== 'ACTIVE' || source.monitor?.status !== 'ACTIVE') {
      throw new ScanError('UNSUPPORTED_SOURCE', 'The source is not active.', false);
    }
    if (source.adapterId !== this.demoAdapter.id) {
      throw new ScanError(
        'UNSUPPORTED_SOURCE',
        'No production adapter is enabled for this source.',
        false,
      );
    }

    const scan = await this.prisma.scan.upsert({
      where: { runKey },
      create: {
        sourceId,
        runKey,
        correlationId,
        status: 'RUNNING',
        mode: 'HTTP',
        adapterId: source.adapterId,
      },
      update: { status: 'RUNNING', errorCode: null, safeError: null, startedAt: new Date() },
    });

    try {
      const fixture = readFixtureState(source.adapterConfig?.config ?? null);
      const scanned = await scanHtml(
        this.demoAdapter,
        source.normalizedUrl,
        await loadDemoFixture(fixture),
      );
      return await this.prisma.$transaction(async (transaction) => {
        await transaction.scan.update({
          where: { id: scan.id },
          data: {
            status: 'SUCCEEDED',
            contentHash: scanned.contentHash,
            durationMs: scanned.durationMs,
            completedAt: new Date(),
            snapshot: {
              upsert: {
                create: {
                  sourceTitle: scanned.sourceTitle,
                  listingCount: scanned.listings.length,
                  warnings: inputJson(scanned.warnings),
                  expiresAt: new Date(Date.now() + 7 * 86_400_000),
                },
                update: {
                  sourceTitle: scanned.sourceTitle,
                  listingCount: scanned.listings.length,
                  warnings: inputJson(scanned.warnings),
                },
              },
            },
          },
        });
        await transaction.extractedListing.deleteMany({ where: { scanId: scan.id } });
        const persistedListings: Array<{ id: string; value: NormalizedListing }> = [];
        for (const listing of scanned.listings) {
          const persisted = await transaction.extractedListing.create({
            data: {
              scanId: scan.id,
              title: listing.title,
              normalizedTitle: listing.normalizedTitle,
              aliases: listing.aliases,
              language: listing.language,
              format: listing.format,
              cinemaName: listing.cinemaName,
              locationName: listing.locationName,
              showDate: listing.showDate === null ? null : new Date(listing.showDate),
              showTime: listing.showTime,
              bookingStatus: listing.bookingStatus,
              bookingUrl: listing.bookingUrl,
              sourceUrl: listing.sourceUrl,
              externalId: listing.externalId,
              detectedAt: new Date(listing.detectedAt),
              metadata: inputJson(listing.metadata),
            },
          });
          persistedListings.push({ id: persisted.id, value: listing });
        }

        const notificationIds: string[] = [];
        const availableListings = persistedListings.filter(
          ({ value }) => value.bookingStatus === 'AVAILABLE',
        );
        for (const watch of source.watchRules) {
          if (
            watch.state === null ||
            watch.state.status === 'PAUSED' ||
            watch.state.status === 'DISABLED'
          )
            continue;
          const match = findBestMatch(
            {
              query: watch.query,
              aliases: watch.aliases.map(({ alias }) => alias),
              mode: watch.matchMode as DomainMatchMode,
              ...(watch.fuzzyThreshold === null ? {} : { fuzzyThreshold: watch.fuzzyThreshold }),
            },
            availableListings.map(({ value }) => value),
          );
          const transition = transitionWatch(mapState(watch.state), {
            kind: match === null ? 'NOT_MATCHED' : 'MATCHED',
          });
          const matched =
            match === null
              ? null
              : (availableListings.find(({ value }) => value === match.listing) ?? null);
          await transaction.watchState.update({
            where: { watchRuleId: watch.id },
            data: {
              status: transition.next.status,
              availability: transition.next.availability,
              occurrence: transition.next.occurrence,
              lastEvaluatedAt: new Date(),
              lastMatchedAt: matched === null ? watch.state.lastMatchedAt : new Date(),
              ...(matched === null ? {} : { lastMatchedListing: inputJson(matched.value) }),
              lastErrorCode: null,
            },
          });
          if (
            !transition.availabilityOpened ||
            matched === null ||
            match === null ||
            matched.value.bookingUrl === null
          )
            continue;
          const event = await transaction.availabilityEvent.upsert({
            where: {
              watchRuleId_type_occurrence: {
                watchRuleId: watch.id,
                type: 'AVAILABILITY_OPENED',
                occurrence: transition.next.occurrence,
              },
            },
            update: {},
            create: {
              watchRuleId: watch.id,
              scanId: scan.id,
              matchedListingId: matched.id,
              type: 'AVAILABILITY_OPENED',
              occurrence: transition.next.occurrence,
              metadata: inputJson({ score: match.result.score, reason: match.result.reason }),
            },
          });
          const key = notificationIdempotencyKey(watch.id, event.type, event.id);
          const notification = await transaction.notification.upsert({
            where: { idempotencyKey: key },
            update: {},
            create: {
              availabilityEventId: event.id,
              channel: watch.notificationChannel,
              idempotencyKey: key,
              correlationId: randomUUID(),
            },
          });
          notificationIds.push(notification.id);
        }
        await transaction.sourceMonitor.update({
          where: { sourceId },
          data: { lastCheckAt: new Date(), lastSuccessAt: new Date(), consecutiveFailures: 0 },
        });
        return { scanId: scan.id, notificationIds, contentHash: scanned.contentHash };
      });
    } catch (error) {
      const failure =
        error instanceof ScanError
          ? error
          : new ScanError('ADAPTER_FAILED', 'The source could not be checked.', true, {
              cause: error,
            });
      await this.recordFailure(scan.id, sourceId, failure);
      throw failure;
    }
  }

  private async recordFailure(scanId: string, sourceId: string, error: ScanError): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.scan.update({
        where: { id: scanId },
        data: {
          status: 'FAILED',
          errorCode: error.code,
          safeError: error.message,
          completedAt: new Date(),
        },
      }),
      this.prisma.sourceMonitor.update({
        where: { sourceId },
        data: { lastCheckAt: new Date(), consecutiveFailures: { increment: 1 } },
      }),
      this.prisma.watchState.updateMany({
        where: {
          watchRule: { sourceId, deletedAt: null },
          status: { notIn: ['PAUSED', 'DISABLED'] },
        },
        data: { status: 'ERROR', lastErrorCode: error.code },
      }),
    ]);
  }
}
