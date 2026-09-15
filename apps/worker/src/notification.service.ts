import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type PrismaClient } from '@ticketwatch/database';
import type { NotificationProvider } from '@ticketwatch/notification-core';
import { NOTIFICATION_PROVIDER, PRISMA } from './tokens.js';

@Injectable()
export class NotificationService {
  public constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(NOTIFICATION_PROVIDER) private readonly provider: NotificationProvider,
  ) {}

  public async send(notificationId: string): Promise<'sent' | 'already-processed'> {
    const claimed = await this.prisma.notification.updateMany({
      where: { id: notificationId, status: { in: ['QUEUED', 'FAILED'] }, attempts: { lt: 5 } },
      data: { status: 'PROCESSING', attempts: { increment: 1 }, lastError: null },
    });
    if (claimed.count === 0) return 'already-processed';

    const notification = await this.prisma.notification.findUniqueOrThrow({
      where: { id: notificationId },
      include: {
        availabilityEvent: {
          include: {
            matchedListing: true,
            watchRule: { include: { user: { include: { profile: true } } } },
          },
        },
      },
    });
    const { matchedListing, watchRule } = notification.availabilityEvent;
    if (matchedListing?.bookingUrl === null || matchedListing?.bookingUrl === undefined) {
      await this.fail(notification.id, 'The matched listing does not have a booking URL.');
      return 'already-processed';
    }
    const profile = watchRule.user.profile;
    if (
      notification.channel === 'WHATSAPP' &&
      (profile?.phoneE164 === null ||
        profile?.phoneE164 === undefined ||
        profile.phoneVerifiedAt === null ||
        profile.whatsappOptInAt === null ||
        profile.whatsappOptOutAt !== null)
    ) {
      await this.fail(notification.id, 'Verified WhatsApp opt-in is required.');
      return 'already-processed';
    }

    try {
      const result = await this.provider.sendAvailabilityAlert({
        notificationId: notification.id,
        idempotencyKey: notification.idempotencyKey,
        recipientE164: profile?.phoneE164 ?? '+10000000000',
        movie: matchedListing.title,
        cinema: matchedListing.cinemaName,
        location: matchedListing.locationName,
        bookingUrl: matchedListing.bookingUrl,
        correlationId: notification.correlationId,
      });
      await this.prisma.$transaction([
        this.prisma.notification.update({
          where: { id: notification.id },
          data: {
            status: 'SENT',
            provider: this.provider.id,
            providerMessageId: result.providerMessageId,
            sentAt: new Date(),
          },
        }),
        this.prisma.notificationDelivery.upsert({
          where: { providerEventId: `${result.providerMessageId}:accepted` },
          update: {},
          create: {
            notificationId: notification.id,
            providerEventId: `${result.providerMessageId}:accepted`,
            status: 'SENT',
            occurredAt: new Date(),
            metadata: result.providerMetadata as Prisma.InputJsonValue,
          },
        }),
        this.prisma.watchState.update({
          where: { watchRuleId: watchRule.id },
          data: { status: 'NOTIFIED' },
        }),
      ]);
      return 'sent';
    } catch (error) {
      await this.fail(
        notification.id,
        error instanceof Error ? error.message : 'Notification provider failed.',
      );
      throw error;
    }
  }

  private async fail(notificationId: string, safeMessage: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'FAILED', lastError: safeMessage.slice(0, 500) },
    });
  }
}
