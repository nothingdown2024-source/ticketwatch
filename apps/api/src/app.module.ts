import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { createPrismaClient } from '@ticketwatch/database';
import { Redis } from 'ioredis';
import { AdminController } from './admin/admin.controller.js';
import { AdminGuard } from './admin/admin.guard.js';
import { AlertController } from './alerts/alert.controller.js';
import { AlertService } from './alerts/alert.service.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { SessionGuard } from './auth/session.js';
import { HealthController } from './health/health.controller.js';
import { WhatsAppWebhookController } from './notifications/whatsapp-webhook.controller.js';
import { SourceController } from './sources/source.controller.js';
import { SourceService } from './sources/source.service.js';
import { PRISMA, REDIS } from './tokens.js';
import { UserController } from './users/user.controller.js';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const parsedRedis = new URL(redisUrl);
const connection = { host: parsedRedis.hostname, port: Number(parsedRedis.port || 6379) };

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    BullModule.forRoot({ connection }),
  ],
  controllers: [
    AuthController,
    UserController,
    SourceController,
    AlertController,
    HealthController,
    WhatsAppWebhookController,
    AdminController,
  ],
  providers: [
    { provide: PRISMA, useFactory: createPrismaClient },
    { provide: REDIS, useFactory: () => new Redis(redisUrl, { maxRetriesPerRequest: null }) },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    AuthService,
    SessionGuard,
    SourceService,
    AlertService,
    AdminGuard,
  ],
})
export class AppModule {}
