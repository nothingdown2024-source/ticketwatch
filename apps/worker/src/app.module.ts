import { config as loadDotEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { createPrismaClient } from '@ticketwatch/database';
import {
  ConsoleNotificationProvider,
  type WhatsAppTemplateParameter,
  WhatsAppCloudProvider,
} from '@ticketwatch/notification-core';
import { Redis } from 'ioredis';
import { DispatcherProcessor } from './dispatcher.processor.js';
import { DispatcherService } from './dispatcher.service.js';
import { loadWorkerConfig } from './config.js';
import { NotificationProcessor } from './notification.processor.js';
import { NotificationService } from './notification.service.js';
import { QUEUES } from './queues.js';
import { ScanProcessor } from './scan.processor.js';
import { ScanService } from './scan.service.js';
import { SchedulerService } from './scheduler.service.js';
import { NOTIFICATION_PROVIDER, PRISMA, REDIS } from './tokens.js';

loadDotEnv({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

const config = loadWorkerConfig();
const redisUrl = new URL(config.redisUrl);
const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  ...(redisUrl.username === '' ? {} : { username: decodeURIComponent(redisUrl.username) }),
  ...(redisUrl.password === '' ? {} : { password: decodeURIComponent(redisUrl.password) }),
  ...(redisUrl.pathname.length <= 1 ? {} : { db: Number(redisUrl.pathname.slice(1)) }),
  ...(redisUrl.protocol === 'rediss:' ? { tls: {} } : {}),
};

function notificationProviderFactory(): ConsoleNotificationProvider | WhatsAppCloudProvider {
  if (process.env.WHATSAPP_PROVIDER !== 'whatsapp') return new ConsoleNotificationProvider();
  const required = [
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID',
    'WHATSAPP_APP_SECRET',
  ] as const;
  for (const variable of required) {
    if (!process.env[variable])
      throw new Error(`${variable} is required for the WhatsApp provider.`);
  }
  return new WhatsAppCloudProvider({
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
    appSecret: process.env.WHATSAPP_APP_SECRET!,
    apiVersion: process.env.WHATSAPP_API_VERSION ?? 'v23.0',
    templateName: process.env.WHATSAPP_TEMPLATE_NAME ?? 'ticket_availability_alert',
    templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? 'en_US',
    templateParameters: whatsappTemplateParameters(),
  });
}

function whatsappTemplateParameters(): WhatsAppTemplateParameter[] {
  const allowed: WhatsAppTemplateParameter[] = ['movie', 'cinema', 'location', 'bookingUrl'];
  const configured = (process.env.WHATSAPP_TEMPLATE_PARAMETERS ?? allowed.join(','))
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  if (configured.length === 0 || configured.some((value) => !allowed.includes(value as WhatsAppTemplateParameter))) {
    throw new Error('WHATSAPP_TEMPLATE_PARAMETERS must use movie, cinema, location, or bookingUrl.');
  }
  return configured as WhatsAppTemplateParameter[];
}

@Module({
  imports: [
    BullModule.forRoot({ connection }),
    BullModule.registerQueue(
      { name: QUEUES.dispatcher },
      { name: QUEUES.sourceScan },
      { name: QUEUES.notification },
      { name: QUEUES.retention },
    ),
  ],
  providers: [
    { provide: PRISMA, useFactory: createPrismaClient },
    {
      provide: REDIS,
      useFactory: () => new Redis(config.redisUrl, { maxRetriesPerRequest: null }),
    },
    { provide: NOTIFICATION_PROVIDER, useFactory: notificationProviderFactory },
    DispatcherService,
    DispatcherProcessor,
    ScanService,
    ScanProcessor,
    NotificationService,
    NotificationProcessor,
    SchedulerService,
  ],
})
export class AppModule {}
