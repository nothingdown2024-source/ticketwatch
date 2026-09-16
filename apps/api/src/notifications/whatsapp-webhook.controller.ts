import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Inject,
  Post,
  Query,
  RawBodyRequest,
  Req,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Prisma, type PrismaClient } from '@ticketwatch/database';
import { WhatsAppCloudProvider } from '@ticketwatch/notification-core';
import type { Request } from 'express';
import { PRISMA } from '../tokens.js';

@ApiTags('webhooks')
@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
  public constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  @Get()
  public verify(
    @Query('hub.mode') mode: string | undefined,
    @Query('hub.verify_token') token: string | undefined,
    @Query('hub.challenge') challenge: string | undefined,
  ): string {
    if (
      mode !== 'subscribe' ||
      token === undefined ||
      challenge === undefined ||
      token !== process.env.WHATSAPP_VERIFY_TOKEN
    ) {
      throw new ForbiddenException('Webhook verification failed.');
    }
    return challenge;
  }

  @Post()
  public async receive(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Body() payload: unknown,
  ): Promise<{ data: { accepted: true; events: number } }> {
    const provider = this.provider();
    const rawBody = request.rawBody;
    if (rawBody === undefined || !provider.validateWebhook(rawBody, signature)) {
      throw new ForbiddenException('Webhook signature is invalid.');
    }
    const events = provider.handleWebhook(payload);
    for (const event of events) {
      await this.prisma.$transaction(async (transaction) => {
        await transaction.webhookEvent.upsert({
          where: {
            provider_providerEventId: {
              provider: provider.id,
              providerEventId: event.providerEventId,
            },
          },
          update: { processedAt: new Date() },
          create: {
            provider: provider.id,
            providerEventId: event.providerEventId,
            signatureValid: true,
            payload: payload as Prisma.InputJsonValue,
            processedAt: new Date(),
          },
        });
        const notification = await transaction.notification.findFirst({
          where: { provider: provider.id, providerMessageId: event.providerMessageId },
        });
        if (notification === null) return;
        await transaction.notificationDelivery.upsert({
          where: { providerEventId: event.providerEventId },
          update: {},
          create: {
            notificationId: notification.id,
            providerEventId: event.providerEventId,
            status: event.status,
            occurredAt: event.occurredAt,
            metadata: event.metadata as Prisma.InputJsonValue,
          },
        });
        await transaction.notification.update({
          where: { id: notification.id },
          data: { status: event.status },
        });
      });
    }
    return { data: { accepted: true, events: events.length } };
  }

  private provider(): WhatsAppCloudProvider {
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret) throw new ServiceUnavailableException('WhatsApp webhooks are not configured.');
    return new WhatsAppCloudProvider({
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? '',
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? '',
      appSecret,
      apiVersion: process.env.WHATSAPP_API_VERSION ?? 'v25.0',
      templateName: process.env.WHATSAPP_TEMPLATE_NAME ?? 'ticket_availability_alert',
      templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? 'en_US',
    });
  }
}
