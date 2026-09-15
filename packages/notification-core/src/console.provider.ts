import { randomUUID } from 'node:crypto';
import type {
  AvailabilityAlertMessage,
  NotificationProvider,
  ProviderSendResult,
  ProviderWebhookResult,
} from './contracts.js';

export interface ConsoleNotificationRecord {
  providerMessageId: string;
  text: string;
  message: AvailabilityAlertMessage;
}

export class ConsoleNotificationProvider implements NotificationProvider {
  public readonly id = 'console';
  private readonly sentByIdempotencyKey = new Map<string, ConsoleNotificationRecord>();

  public async sendAvailabilityAlert(
    message: AvailabilityAlertMessage,
  ): Promise<ProviderSendResult> {
    const existing = this.sentByIdempotencyKey.get(message.idempotencyKey);
    if (existing !== undefined) {
      return {
        providerMessageId: existing.providerMessageId,
        status: 'SENT',
        providerMetadata: { duplicateSuppressed: true },
      };
    }
    const details = [message.cinema, message.location].filter(
      (value): value is string => value !== null,
    );
    const text = [
      '🎟️ Ticket Alert',
      '',
      `Tickets for ${message.movie} appear to be available.`,
      ...details,
      '',
      'Book now:',
      message.bookingUrl,
    ].join('\n');
    const record = { providerMessageId: randomUUID(), text, message };
    this.sentByIdempotencyKey.set(message.idempotencyKey, record);
    return {
      providerMessageId: record.providerMessageId,
      status: 'SENT',
      providerMetadata: { provider: 'console' },
    };
  }

  public validateWebhook(): boolean {
    return false;
  }

  public handleWebhook(): ProviderWebhookResult[] {
    return [];
  }

  public records(): ConsoleNotificationRecord[] {
    return [...this.sentByIdempotencyKey.values()];
  }
}
