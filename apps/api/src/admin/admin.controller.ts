import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { PrismaClient } from '@ticketwatch/database';
import { SessionGuard } from '../auth/session.js';
import { PRISMA } from '../tokens.js';
import { AdminGuard } from './admin.guard.js';

@ApiTags('admin')
@Controller('admin')
@UseGuards(SessionGuard, AdminGuard)
export class AdminController {
  public constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  @Get('stats')
  public async stats() {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const [
      users,
      activeWatches,
      uniqueSources,
      scansToday,
      successfulScans,
      failedScans,
      httpScans,
      browserScans,
      notificationsSent,
      notificationFailures,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.watchState.count({
        where: { status: { in: ['SEARCHING', 'AVAILABLE', 'NOTIFIED'] } },
      }),
      this.prisma.source.count(),
      this.prisma.scan.count({ where: { createdAt: { gte: since } } }),
      this.prisma.scan.count({ where: { createdAt: { gte: since }, status: 'SUCCEEDED' } }),
      this.prisma.scan.count({ where: { createdAt: { gte: since }, status: 'FAILED' } }),
      this.prisma.scan.count({ where: { createdAt: { gte: since }, mode: 'HTTP' } }),
      this.prisma.scan.count({ where: { createdAt: { gte: since }, mode: 'BROWSER' } }),
      this.prisma.notification.count({
        where: { createdAt: { gte: since }, status: { in: ['SENT', 'DELIVERED', 'READ'] } },
      }),
      this.prisma.notification.count({ where: { createdAt: { gte: since }, status: 'FAILED' } }),
    ]);
    return {
      data: {
        users,
        activeWatches,
        uniqueSources,
        scansToday,
        successfulScans,
        failedScans,
        httpScans,
        browserScans,
        notificationsSent,
        notificationFailures,
      },
    };
  }

  @Get('sources')
  public async sources() {
    return {
      data: await this.prisma.source.findMany({
        include: { monitor: true, _count: { select: { watchRules: true, scans: true } } },
        take: 100,
        orderBy: { updatedAt: 'desc' },
      }),
    };
  }

  @Get('scans')
  public async scans() {
    return {
      data: await this.prisma.scan.findMany({
        include: { snapshot: true, source: true },
        take: 100,
        orderBy: { createdAt: 'desc' },
      }),
    };
  }

  @Get('notifications')
  public async notifications() {
    return {
      data: await this.prisma.notification.findMany({
        include: { deliveries: true },
        take: 100,
        orderBy: { createdAt: 'desc' },
      }),
    };
  }
}
