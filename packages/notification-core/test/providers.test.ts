import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ConsoleNotificationProvider, WhatsAppCloudProvider } from '../src/index.js';

const message = {
  notificationId: 'notification-1',
  idempotencyKey: 'stable-key',
  recipientE164: '+919999999999',
  movie: 'Avatar: Fire and Ash',
  cinema: 'Demo Cinema',
  location: 'Hyderabad',
  bookingUrl: 'https://demo.ticketwatch.local/book/avatar',
  correlationId: 'correlation-1',
};

describe('ConsoleNotificationProvider', () => {
  it('records the required message exactly once across retries', async () => {
    const provider = new ConsoleNotificationProvider();
    const first = await provider.sendAvailabilityAlert(message);
    const retry = await provider.sendAvailabilityAlert(message);
    expect(retry.providerMessageId).toBe(first.providerMessageId);
    expect(provider.records()).toHaveLength(1);
    expect(provider.records()[0]?.text).toContain(
      'Tickets for Avatar: Fire and Ash appear to be available.',
    );
  });
});

describe('WhatsAppCloudProvider', () => {
  const provider = new WhatsAppCloudProvider({
    accessToken: 'test',
    phoneNumberId: 'phone',
    appSecret: 'secret',
    apiVersion: 'v23.0',
    templateName: 'ticket_alert',
    templateLanguage: 'en_US',
  });

  it('validates a webhook signature over the raw body', () => {
    const body = Buffer.from('{"ok":true}');
    const signature = `sha256=${createHmac('sha256', 'secret').update(body).digest('hex')}`;
    expect(provider.validateWebhook(body, signature)).toBe(true);
    expect(provider.validateWebhook(body, 'sha256=00')).toBe(false);
  });

  it('maps provider delivery states without treating send acceptance as delivery', () => {
    expect(
      provider.handleWebhook({
        entry: [
          {
            changes: [
              { value: { statuses: [{ id: 'wamid.1', status: 'delivered', timestamp: '1' }] } },
            ],
          },
        ],
      }),
    ).toEqual([expect.objectContaining({ providerMessageId: 'wamid.1', status: 'DELIVERED' })]);
  });
});
