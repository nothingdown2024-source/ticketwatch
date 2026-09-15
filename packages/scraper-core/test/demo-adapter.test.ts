import { describe, expect, it } from 'vitest';
import { DemoAdapter, loadDemoFixture, scanHtml } from '../src/index.js';

describe('DemoAdapter contract', () => {
  const adapter = new DemoAdapter();
  const sourceUrl = 'https://demo.ticketwatch.local/cinema/hyderabad';

  it('detects only its supported host', () => {
    expect(adapter.detect(new URL(sourceUrl))).toBe(true);
    expect(adapter.detect(new URL('https://example.com'))).toBe(false);
  });

  it('extracts the initial fixture without the watched movie', async () => {
    const result = await scanHtml(adapter, sourceUrl, await loadDemoFixture('state-1'));
    expect(result.listings.map(({ title }) => title)).toEqual(['Coolie', 'War 2']);
  });

  it('extracts the availability transition fixture', async () => {
    const result = await scanHtml(adapter, sourceUrl, await loadDemoFixture('state-2'));
    expect(result.listings).toContainEqual(
      expect.objectContaining({
        title: 'Avatar: Fire and Ash',
        normalizedTitle: 'avatar fire and ash',
        bookingStatus: 'AVAILABLE',
        bookingUrl: 'https://demo.ticketwatch.local/book/avatar-fire-and-ash',
      }),
    );
  });
});
