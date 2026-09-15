import { randomUUID } from 'node:crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type PrismaClient } from '@ticketwatch/database';
import type { Queue } from 'bullmq';
import { QUEUES, type SourceScanJobData } from './queues.js';
import { PRISMA } from './tokens.js';

interface ClaimedMonitor {
  id: string;
  sourceId: string;
  intervalSeconds: number;
  scheduledFor: Date;
}

@Injectable()
export class DispatcherService {
  public constructor(
    @Inject(PRISMA)
    private readonly prisma: PrismaClient,
    @InjectQueue(QUEUES.sourceScan) private readonly scanQueue: Queue<SourceScanJobData>,
  ) {}

  public async dispatchDueSources(workerId: string, jitterSeconds: number): Promise<number> {
    const now = new Date();
    const claimUntil = new Date(now.getTime() + 60_000);
    const claimed = await this.prisma.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id
        FROM "SourceMonitor"
        WHERE status = 'ACTIVE'::"MonitorStatus"
          AND "nextCheckAt" <= ${now}
          AND ("claimedUntil" IS NULL OR "claimedUntil" < ${now})
        ORDER BY "nextCheckAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 100
      `);
      const results: ClaimedMonitor[] = [];
      for (const row of rows) {
        const monitor = await transaction.sourceMonitor.findUniqueOrThrow({
          where: { id: row.id },
        });
        const jitter = Math.floor(Math.random() * (jitterSeconds * 2 + 1)) - jitterSeconds;
        const nextCheckAt = new Date(
          now.getTime() + Math.max(15, monitor.intervalSeconds + jitter) * 1000,
        );
        await transaction.sourceMonitor.update({
          where: { id: monitor.id },
          data: { claimedUntil: claimUntil, claimedBy: workerId, nextCheckAt },
        });
        results.push({
          id: monitor.id,
          sourceId: monitor.sourceId,
          intervalSeconds: monitor.intervalSeconds,
          scheduledFor: monitor.nextCheckAt,
        });
      }
      return results;
    });

    for (const monitor of claimed) {
      const runKey = `${monitor.sourceId}-${monitor.scheduledFor.toISOString()}`;
      const data = { sourceId: monitor.sourceId, runKey, correlationId: randomUUID() };
      await this.scanQueue.add('scan-source', data, {
        jobId: runKey.replaceAll(':', '-'),
        attempts: 4,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: { age: 86_400, count: 10_000 },
        removeOnFail: { age: 604_800, count: 25_000 },
      });
      await this.prisma.sourceMonitor.update({
        where: { id: monitor.id },
        data: { claimedUntil: null, claimedBy: null },
      });
    }
    return claimed.length;
  }
}
