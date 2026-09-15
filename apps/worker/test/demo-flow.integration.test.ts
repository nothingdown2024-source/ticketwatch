import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient, type PrismaClient } from '@ticketwatch/database';
import { ConsoleNotificationProvider } from '@ticketwatch/notification-core';
import { notificationIdempotencyKey } from '@ticketwatch/shared';
import { NotificationService } from '../src/notification.service.js';
import { ScanService } from '../src/scan.service.js';

const integration = process.env.RUN_INTEGRATION === 'true' ? describe : describe.skip;

integration('PostgreSQL DemoAdapter flow', () => {
  let prisma: PrismaClient;
  let userId: string;
  let sourceId: string;
  let watchRuleId: string;

  beforeAll(async () => {
    prisma = createPrismaClient();
    const suffix = randomUUID();
    const user = await prisma.user.create({
      data: {
        email: `integration-${suffix}@ticketwatch.local`,
        passwordHash: 'not-used-in-integration-test',
        profile: {
          create: {
            displayName: 'Integration User',
            phoneE164: '+919000000001',
            phoneVerifiedAt: new Date(),
            whatsappOptInAt: new Date(),
          },
        },
      },
    });
    userId = user.id;
    const source = await prisma.source.create({
      data: {
        originalUrl: `https://demo.ticketwatch.local/cinema/${suffix}`,
        normalizedUrl: `https://demo.ticketwatch.local/cinema/${suffix}`,
        fingerprint: suffix.replaceAll('-', '').padEnd(64, '0').slice(0, 64),
        host: 'demo.ticketwatch.local',
        adapterId: 'demo',
        displayName: 'Demo Cinema',
        adapterConfig: {
          create: { config: { fixtureState: 'state-1' }, minimumIntervalSeconds: 15 },
        },
        monitor: { create: { intervalSeconds: 15, nextCheckAt: new Date() } },
      },
    });
    sourceId = source.id;
    const watch = await prisma.watchRule.create({
      data: {
        userId,
        sourceId,
        query: 'Avatar Fire and Ash',
        normalizedQuery: 'avatar fire and ash',
        matchMode: 'ALIASES',
        notificationChannel: 'CONSOLE',
        aliases: { create: { alias: 'Avatar 3', normalizedAlias: 'avatar 3' } },
        state: { create: { status: 'SEARCHING', availability: 'NOT_AVAILABLE' } },
      },
    });
    watchRuleId = watch.id;
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.notificationDelivery.deleteMany({
      where: { notification: { availabilityEvent: { watchRuleId } } },
    });
    await prisma.notification.deleteMany({ where: { availabilityEvent: { watchRuleId } } });
    await prisma.availabilityEvent.deleteMany({ where: { watchRuleId } });
    await prisma.watchRule.delete({ where: { id: watchRuleId } });
    await prisma.scan.deleteMany({ where: { sourceId } });
    await prisma.source.delete({ where: { id: sourceId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('persists one event and one provider send across job retries', async () => {
    const scans = new ScanService(prisma);
    const first = await scans.scanSource(sourceId, `integration-${sourceId}-1`, randomUUID());
    expect(first.notificationIds).toHaveLength(0);
    expect(await prisma.watchState.findUniqueOrThrow({ where: { watchRuleId } })).toMatchObject({
      status: 'SEARCHING',
      availability: 'NOT_AVAILABLE',
    });

    await prisma.sourceAdapterConfig.update({
      where: { sourceId },
      data: { config: { fixtureState: 'state-2' } },
    });
    const opened = await scans.scanSource(sourceId, `integration-${sourceId}-2`, randomUUID());
    expect(opened.notificationIds).toHaveLength(1);
    const retry = await scans.scanSource(sourceId, `integration-${sourceId}-2`, randomUUID());
    expect(retry.notificationIds).toEqual(opened.notificationIds);
    await scans.scanSource(sourceId, `integration-${sourceId}-3`, randomUUID());

    expect(await prisma.availabilityEvent.count({ where: { watchRuleId } })).toBe(1);
    expect(await prisma.notification.count({ where: { availabilityEvent: { watchRuleId } } })).toBe(
      1,
    );
    const event = await prisma.availabilityEvent.findFirstOrThrow({ where: { watchRuleId } });
    expect(
      await prisma.notification.findUnique({
        where: { idempotencyKey: notificationIdempotencyKey(watchRuleId, event.type, event.id) },
      }),
    ).not.toBeNull();

    const provider = new ConsoleNotificationProvider();
    const notifications = new NotificationService(prisma, provider);
    expect(await notifications.send(opened.notificationIds[0]!)).toBe('sent');
    expect(await notifications.send(opened.notificationIds[0]!)).toBe('already-processed');
    expect(provider.records()).toHaveLength(1);
  });
});
