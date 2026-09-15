import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaClient } from '@ticketwatch/database';
import { normalizeTitle } from '@ticketwatch/shared';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { SourceService } from '../sources/source.service.js';
import { PRISMA } from '../tokens.js';
import type { CreateAlertDto } from './dto.js';
import { assertOwner } from './ownership.js';

@Injectable()
export class AlertService {
  public constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly sources: SourceService,
  ) {}

  public async create(input: CreateAlertDto, user: AuthenticatedUser) {
    const preview = await this.sources.preview(input.sourceUrl);
    if (!preview.supported) throw new NotFoundException('This source is not currently supported.');
    const source = await this.prisma.source.upsert({
      where: { fingerprint: preview.fingerprint },
      update: {},
      create: {
        originalUrl: input.sourceUrl,
        normalizedUrl: preview.normalizedUrl,
        fingerprint: preview.fingerprint,
        host: new URL(preview.normalizedUrl).hostname,
        adapterId: preview.adapter.id,
        displayName: preview.detectedTitle,
        adapterConfig: {
          create: { config: { fixtureState: 'state-1' }, minimumIntervalSeconds: 15 },
        },
        monitor: {
          create: {
            intervalSeconds: process.env.NODE_ENV === 'production' ? 180 : 15,
            nextCheckAt: new Date(),
          },
        },
      },
    });
    const alert = await this.prisma.watchRule.create({
      data: {
        userId: user.id,
        sourceId: source.id,
        query: input.query.trim(),
        normalizedQuery: normalizeTitle(input.query),
        matchMode: input.matchMode,
        notificationChannel: input.notificationChannel,
        ...(input.fuzzyThreshold === undefined ? {} : { fuzzyThreshold: input.fuzzyThreshold }),
        aliases: {
          create: [...new Set(input.aliases.map((alias) => alias.trim()).filter(Boolean))].map(
            (alias) => ({
              alias,
              normalizedAlias: normalizeTitle(alias),
            }),
          ),
        },
        state: { create: { status: 'SEARCHING', availability: 'NOT_AVAILABLE' } },
      },
      include: { source: true, state: true, aliases: true },
    });
    return alert;
  }

  public async list(user: AuthenticatedUser) {
    return this.prisma.watchRule.findMany({
      where: { userId: user.id, deletedAt: null },
      include: { source: { include: { monitor: true } }, state: true, aliases: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  public async detail(id: string, user: AuthenticatedUser) {
    const alert = await this.prisma.watchRule.findFirst({
      where: { id, deletedAt: null },
      include: {
        source: { include: { monitor: true, scans: { orderBy: { createdAt: 'desc' }, take: 25 } } },
        state: true,
        aliases: true,
        availabilityEvents: {
          include: { matchedListing: true, notifications: { include: { deliveries: true } } },
          orderBy: { occurredAt: 'desc' },
          take: 50,
        },
      },
    });
    if (alert === null) throw new NotFoundException('Alert not found.');
    assertOwner(alert.userId, user.id);
    return alert;
  }

  public async setPaused(id: string, user: AuthenticatedUser, paused: boolean) {
    const alert = await this.detail(id, user);
    return this.prisma.watchState.update({
      where: { watchRuleId: alert.id },
      data: {
        status: paused
          ? 'PAUSED'
          : alert.state?.availability === 'AVAILABLE'
            ? 'AVAILABLE'
            : 'SEARCHING',
      },
    });
  }

  public async updateAliases(id: string, user: AuthenticatedUser, aliases: string[]) {
    const alert = await this.detail(id, user);
    const unique = [...new Set(aliases.map((alias) => alias.trim()).filter(Boolean))];
    await this.prisma.$transaction([
      this.prisma.watchAlias.deleteMany({ where: { watchRuleId: alert.id } }),
      this.prisma.watchAlias.createMany({
        data: unique.map((alias) => ({
          watchRuleId: alert.id,
          alias,
          normalizedAlias: normalizeTitle(alias),
        })),
      }),
    ]);
    return this.detail(id, user);
  }

  public async softDelete(id: string, user: AuthenticatedUser): Promise<void> {
    const alert = await this.detail(id, user);
    await this.prisma.$transaction([
      this.prisma.watchRule.update({ where: { id: alert.id }, data: { deletedAt: new Date() } }),
      this.prisma.watchState.update({
        where: { watchRuleId: alert.id },
        data: { status: 'DISABLED' },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'ALERT_SOFT_DELETED',
          entityType: 'WatchRule',
          entityId: alert.id,
          correlationId: crypto.randomUUID(),
        },
      }),
    ]);
  }
}
