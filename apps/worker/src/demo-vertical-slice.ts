import { randomUUID } from 'node:crypto';
import { ConsoleNotificationProvider } from '@ticketwatch/notification-core';
import {
  DemoAdapter,
  loadDemoFixture,
  scanHtml,
  type DemoFixtureState,
} from '@ticketwatch/scraper-core';
import {
  findBestMatch,
  notificationIdempotencyKey,
  transitionWatch,
  type WatchStateValue,
} from '@ticketwatch/shared';

export class DemoVerticalSlice {
  private readonly adapter = new DemoAdapter();
  private readonly provider = new ConsoleNotificationProvider();
  private state: WatchStateValue = {
    status: 'SEARCHING',
    availability: 'NOT_AVAILABLE',
    occurrence: 0,
  };
  private readonly events = new Map<string, string>();

  public async run(state: DemoFixtureState): Promise<void> {
    const sourceUrl = 'https://demo.ticketwatch.local/cinema/hyderabad';
    const scan = await scanHtml(this.adapter, sourceUrl, await loadDemoFixture(state));
    const match = findBestMatch(
      { query: 'Avatar Fire and Ash', aliases: ['Avatar 3'], mode: 'ALIASES' },
      scan.listings.filter(({ bookingStatus }) => bookingStatus === 'AVAILABLE'),
    );
    const transition = transitionWatch(this.state, {
      kind: match === null ? 'NOT_MATCHED' : 'MATCHED',
    });
    this.state = transition.next;
    if (!transition.availabilityOpened || match?.listing.bookingUrl === null || match === null)
      return;
    const occurrenceId = `watch-demo:${this.state.occurrence}`;
    const key = notificationIdempotencyKey('watch-demo', 'AVAILABILITY_OPENED', occurrenceId);
    if (this.events.has(key)) return;
    this.events.set(key, randomUUID());
    await this.provider.sendAvailabilityAlert({
      notificationId: this.events.get(key)!,
      idempotencyKey: key,
      recipientE164: '+919999999999',
      movie: match.listing.title,
      cinema: match.listing.cinemaName,
      location: match.listing.locationName,
      bookingUrl: match.listing.bookingUrl,
      correlationId: randomUUID(),
    });
    this.state = transitionWatch(this.state, { kind: 'NOTIFICATION_SENT' }).next;
  }

  public snapshot(): {
    state: WatchStateValue;
    eventCount: number;
    notificationCount: number;
    message: string | null;
  } {
    return {
      state: this.state,
      eventCount: this.events.size,
      notificationCount: this.provider.records().length,
      message: this.provider.records()[0]?.text ?? null,
    };
  }
}
