import { load } from 'cheerio';
import { normalizeTitle, type ExtractionResult, type NormalizedListing } from '@ticketwatch/shared';
import type { ExtractionContext, TicketSourceAdapter } from '../../contracts.js';
import { canonicalizeGenericUrl } from '../../url-normalization.js';

export class DemoAdapter implements TicketSourceAdapter {
  public readonly id = 'demo';
  public readonly displayName = 'TicketWatch Demo Cinema';
  public readonly supportedHosts = ['demo.ticketwatch.local'] as const;
  public readonly minimumIntervalSeconds = 15;

  public detect(url: URL): boolean {
    return url.hostname.toLowerCase() === 'demo.ticketwatch.local';
  }

  public canonicalize(url: URL): URL {
    return canonicalizeGenericUrl(url);
  }

  public getScanMode(): 'HTTP' {
    return 'HTTP';
  }

  public async extract(context: ExtractionContext): Promise<ExtractionResult> {
    const $ = load(context.html);
    const sourceTitle = $('h1').first().text().trim() || null;
    const listings: NormalizedListing[] = [];
    $('[data-movie]').each((_index, element) => {
      const node = $(element);
      const title = node.attr('data-title')?.trim() ?? node.find('[data-title]').text().trim();
      if (title === '') return;
      const status = node.attr('data-status') === 'available' ? 'AVAILABLE' : 'NOT_AVAILABLE';
      const href = node.find('a[href]').attr('href');
      listings.push({
        title,
        normalizedTitle: normalizeTitle(title),
        aliases: (node.attr('data-aliases') ?? '')
          .split('|')
          .map((value) => value.trim())
          .filter(Boolean),
        language: node.attr('data-language') ?? null,
        format: node.attr('data-format') ?? null,
        cinemaName: sourceTitle,
        locationName: node.attr('data-location') ?? null,
        showDate: node.attr('data-date') ?? null,
        showTime: node.attr('data-time') ?? null,
        bookingStatus: status,
        bookingUrl: href === undefined ? null : new URL(href, context.sourceUrl).toString(),
        sourceUrl: context.sourceUrl,
        externalId: node.attr('data-id') ?? null,
        detectedAt: context.detectedAt.toISOString(),
        metadata: { fixture: true },
      });
    });
    return { sourceTitle, listings, warnings: [] };
  }

  public normalize(result: ExtractionResult): NormalizedListing[] {
    return result.listings;
  }

  public validateResult(result: ExtractionResult): boolean {
    return result.sourceTitle !== null && result.listings.length > 0;
  }
}
