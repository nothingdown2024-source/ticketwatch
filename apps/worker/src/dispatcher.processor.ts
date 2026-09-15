import { hostname } from 'node:os';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { type Job } from 'bullmq';
import { loadWorkerConfig } from './config.js';
import { DispatcherService } from './dispatcher.service.js';
import { QUEUES } from './queues.js';

@Processor(QUEUES.dispatcher, { concurrency: 1 })
export class DispatcherProcessor extends WorkerHost {
  public constructor(@Inject(DispatcherService) private readonly dispatcher: DispatcherService) {
    super();
  }

  public async process(_job: Job): Promise<{ dispatched: number }> {
    const config = loadWorkerConfig();
    const dispatched = await this.dispatcher.dispatchDueSources(
      `${hostname()}:${process.pid}`,
      config.scanJitterSeconds,
    );
    return { dispatched };
  }
}
