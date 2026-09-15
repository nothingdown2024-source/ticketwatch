import { randomUUID } from 'node:crypto';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { type Job, type Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import { QUEUES, type NotificationJobData, type SourceScanJobData } from './queues.js';
import { ScanService } from './scan.service.js';
import { REDIS } from './tokens.js';

@Processor(QUEUES.sourceScan, { concurrency: 10, lockDuration: 120_000 })
export class ScanProcessor extends WorkerHost {
  public constructor(
    @Inject(ScanService)
    private readonly scans: ScanService,
    @Inject(REDIS) private readonly redis: Redis,
    @InjectQueue(QUEUES.notification)
    private readonly notificationQueue: Queue<NotificationJobData>,
  ) {
    super();
  }

  public async process(
    job: Job<SourceScanJobData>,
  ): Promise<{ scanId: string; notifications: number }> {
    const lockKey = `ticketwatch:source-lock:${job.data.sourceId}`;
    const lockToken = randomUUID();
    const acquired = await this.redis.set(lockKey, lockToken, 'PX', 120_000, 'NX');
    if (acquired !== 'OK') throw new Error('Source scan already active; retrying later.');
    try {
      const result = await this.scans.scanSource(
        job.data.sourceId,
        job.data.runKey,
        job.data.correlationId,
      );
      for (const notificationId of result.notificationIds) {
        await this.notificationQueue.add(
          'send-notification',
          { notificationId, correlationId: job.data.correlationId },
          {
            jobId: notificationId,
            attempts: 5,
            backoff: { type: 'exponential', delay: 10_000 },
            removeOnComplete: { age: 604_800, count: 25_000 },
          },
        );
      }
      return { scanId: result.scanId, notifications: result.notificationIds.length };
    } finally {
      await this.redis.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
        1,
        lockKey,
        lockToken,
      );
    }
  }
}
