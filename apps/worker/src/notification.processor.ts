import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import type { Job } from 'bullmq';
import { NotificationService } from './notification.service.js';
import { QUEUES, type NotificationJobData } from './queues.js';

@Processor(QUEUES.notification, { concurrency: 20 })
export class NotificationProcessor extends WorkerHost {
  public constructor(@Inject(NotificationService) private readonly notifications: NotificationService) {
    super();
  }

  public async process(job: Job<NotificationJobData>): Promise<{ result: string }> {
    return { result: await this.notifications.send(job.data.notificationId) };
  }
}
