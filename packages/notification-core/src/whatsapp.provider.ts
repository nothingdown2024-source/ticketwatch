import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  AvailabilityAlertMessage,
  NotificationProvider,
  ProviderSendResult,
  ProviderWebhookResult,
} from './contracts.js';

export interface WhatsAppProviderOptions {
  accessToken: string;
  phoneNumberId: string;
  appSecret: string;
  apiVersion: string;
  templateName: string;
  templateLanguage: string;
  templateParameters?: WhatsAppTemplateParameter[];
  fetchImplementation?: typeof fetch;
}

export type WhatsAppTemplateParameter = 'movie' | 'cinema' | 'location' | 'bookingUrl';

const defaultTemplateParameters: WhatsAppTemplateParameter[] = [
  'movie',
  'cinema',
  'location',
  'bookingUrl',
];

interface WhatsAppSendResponse {
  messages?: Array<{ id?: string }>;
}

export class WhatsAppCloudProvider implements NotificationProvider {
  public readonly id = 'whatsapp-cloud';
  private readonly fetchImplementation: typeof fetch;

  public constructor(private readonly options: WhatsAppProviderOptions) {
    this.fetchImplementation = options.fetchImplementation ?? fetch;
  }

  public async sendAvailabilityAlert(
    message: AvailabilityAlertMessage,
  ): Promise<ProviderSendResult> {
    const response = await this.fetchImplementation(
      `https://graph.facebook.com/${this.options.apiVersion}/${this.options.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.options.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: message.recipientE164.replace(/^\+/u, ''),
          type: 'template',
          template: {
            name: this.options.templateName,
            language: { code: this.options.templateLanguage },
            components: [
              {
                type: 'body',
                parameters: this.templateValues(message).map((text) => ({ type: 'text', text })),
              },
            ],
          },
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok)
      throw new Error(`WhatsApp provider rejected the request (${response.status}).`);
    const payload = (await response.json()) as WhatsAppSendResponse;
    const providerMessageId = payload.messages?.[0]?.id;
    if (providerMessageId === undefined)
      throw new Error('WhatsApp response did not include a message ID.');
    return {
      providerMessageId,
      status: 'SENT',
      providerMetadata: { acceptedAt: new Date().toISOString() },
    };
  }

  public validateWebhook(rawBody: Uint8Array, signature: string | undefined): boolean {
    if (signature === undefined || !signature.startsWith('sha256=')) return false;
    const expected = createHmac('sha256', this.options.appSecret).update(rawBody).digest('hex');
    const supplied = signature.slice('sha256='.length);
    if (expected.length !== supplied.length) return false;
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(supplied, 'hex'));
  }

  private templateValues(message: AvailabilityAlertMessage): string[] {
    const values: Record<WhatsAppTemplateParameter, string> = {
      movie: message.movie,
      cinema: message.cinema ?? 'Cinema',
      location: message.location ?? 'Location unavailable',
      bookingUrl: message.bookingUrl,
    };
    return (this.options.templateParameters ?? defaultTemplateParameters).map(
      (parameter) => values[parameter],
    );
  }

  public handleWebhook(payload: unknown): ProviderWebhookResult[] {
    if (typeof payload !== 'object' || payload === null || !('entry' in payload)) return [];
    const entries = (payload as { entry?: unknown[] }).entry;
    if (!Array.isArray(entries)) return [];
    const results: ProviderWebhookResult[] = [];
    for (const entry of entries) {
      const changes =
        typeof entry === 'object' && entry !== null && 'changes' in entry
          ? (entry as { changes?: unknown[] }).changes
          : [];
      if (!Array.isArray(changes)) continue;
      for (const change of changes) {
        const statuses =
          typeof change === 'object' && change !== null && 'value' in change
            ? (change as { value?: { statuses?: unknown[] } }).value?.statuses
            : [];
        if (!Array.isArray(statuses)) continue;
        for (const rawStatus of statuses) {
          if (typeof rawStatus !== 'object' || rawStatus === null) continue;
          const status = rawStatus as { id?: string; status?: string; timestamp?: string };
          if (
            status.id === undefined ||
            !['delivered', 'read', 'failed'].includes(status.status ?? '')
          )
            continue;
          const mapped =
            status.status === 'delivered'
              ? 'DELIVERED'
              : status.status === 'read'
                ? 'READ'
                : 'FAILED';
          results.push({
            providerEventId: `${status.id}:${status.status}:${status.timestamp ?? ''}`,
            providerMessageId: status.id,
            status: mapped,
            occurredAt: new Date(Number(status.timestamp ?? 0) * 1000),
            metadata: {},
          });
        }
      }
    }
    return results;
  }
}
