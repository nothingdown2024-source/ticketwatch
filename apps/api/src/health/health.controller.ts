import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import type { PrismaClient } from '@ticketwatch/database';
import type { Redis } from 'ioredis';
import { PRISMA, REDIS } from '../tokens.js';

@Controller('health')
export class HealthController {
  public constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  @Get('live')
  public live(): { status: 'ok'; service: 'api' } {
    return { status: 'ok', service: 'api' };
  }

  @Get('ready')
  public async ready(): Promise<{
    status: 'ready';
    dependencies: { database: 'ok'; redis: 'ok' };
  }> {
    try {
      await Promise.all([this.prisma.$queryRaw`SELECT 1`, this.redis.ping()]);
      return { status: 'ready', dependencies: { database: 'ok', redis: 'ok' } };
    } catch {
      throw new ServiceUnavailableException('A required dependency is unavailable.');
    }
  }
}
