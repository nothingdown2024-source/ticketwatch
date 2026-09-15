import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { loadWorkerConfig } from './config.js';
import { QUEUES } from './queues.js';

@Injectable()
export class SchedulerService implements OnApplicationBootstrap {
  public constructor(@InjectQueue(QUEUES.dispatcher) private readonly dispatcherQueue: Queue) {}

  public async onApplicationBootstrap(): Promise<void> {
    const { dispatchIntervalSeconds } = loadWorkerConfig();
    await this.dispatcherQueue.upsertJobScheduler(
      'central-source-dispatcher',
      { every: dispatchIntervalSeconds * 1000 },
      {
        name: 'dispatch-due-sources',
        data: {},
        opts: { removeOnComplete: { age: 86_400, count: 1_000 } },
      },
    );
  }
}
