import type { NotificationStatus } from '@ticketwatch/shared';

export interface AvailabilityAlertMessage {
  notificationId: string;
  idempotencyKey: string;
  recipientE164: string;
  movie: string;
  cinema: string | null;
  location: string | null;
  bookingUrl: string;
  correlationId: string;
}

export interface ProviderSendResult {
  providerMessageId: string;
  status: Extract<NotificationStatus, 'SENT'>;
  providerMetadata: Readonly<Record<string, unknown>>;
}

export interface ProviderWebhookResult {
  providerEventId: string;
  providerMessageId: string;
  status: Extract<NotificationStatus, 'DELIVERED' | 'READ' | 'FAILED'>;
  occurredAt: Date;
  metadata: Readonly<Record<string, unknown>>;
}

export interface NotificationProvider {
  readonly id: string;
  sendAvailabilityAlert(message: AvailabilityAlertMessage): Promise<ProviderSendResult>;
  validateWebhook(rawBody: Uint8Array, signature: string | undefined): boolean;
  handleWebhook(payload: unknown): ProviderWebhookResult[];
}
