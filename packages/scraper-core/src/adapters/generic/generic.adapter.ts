import { load } from 'cheerio';
import { normalizeTitle, type ExtractionResult, type NormalizedListing } from '@ticketwatch/shared';
import type { ExtractionContext, TicketSourceAdapter } from '../../contracts.js';
import { canonicalizeGenericUrl } from '../../url-normalization.js';

interface JsonLdMovie {
  '@type'?: string | string[];
  name?: string;
  url?: string;
}

function isMovie(value: JsonLdMovie): boolean {
  const type = value['@type'];
  return type === 'Movie' || (Array.isArray(type) && type.includes('Movie'));
}

export class GenericAdapter implements TicketSourceAdapter {
  public readonly id = 'generic';
  public readonly displayName = 'Generic public HTML';
  public readonly supportedHosts: readonly string[] = [];
  public readonly minimumIntervalSeconds = 300;

  public detect(): boolean {
    return true;
  }

  public canonicalize(url: URL): URL {
    return canonicalizeGenericUrl(url);
  }

  public getScanMode(): 'HTTP' {
    return 'HTTP';
  }

  public async extract(context: ExtractionContext): Promise<ExtractionResult> {
    const $ = load(context.html);
    const listings: NormalizedListing[] = [];
    $('script[type="application/ld+json"]').each((_index, element) => {
      try {
        const parsed: unknown = JSON.parse($(element).text());
        const nodes = Array.isArray(parsed) ? parsed : [parsed];
        for (const node of nodes) {
          if (typeof node !== 'object' || node === null || !isMovie(node as JsonLdMovie)) continue;
          const movie = node as JsonLdMovie;
          if (typeof movie.name !== 'string' || movie.name.trim().length < 2) continue;
          const bookingUrl =
            typeof movie.url === 'string' ? new URL(movie.url, context.sourceUrl).toString() : null;
          listings.push({
            title: movie.name.trim(),
            normalizedTitle: normalizeTitle(movie.name),
            aliases: [],
            language: null,
            format: null,
            cinemaName: null,
            locationName: null,
            showDate: null,
            showTime: null,
            bookingStatus: bookingUrl === null ? 'UNKNOWN' : 'AVAILABLE',
            bookingUrl,
            sourceUrl: context.sourceUrl,
            externalId: null,
            detectedAt: context.detectedAt.toISOString(),
            metadata: { extraction: 'schema-org' },
          });
        }
      } catch {
        // Invalid third-party JSON-LD is ignored; the adapter fails validation if no reliable movie remains.
      }
    });
    return {
      sourceTitle: $('title').text().trim() || null,
      listings,
      warnings: listings.length === 0 ? ['No reliable schema.org Movie data was found.'] : [],
    };
  }

  public normalize(result: ExtractionResult): NormalizedListing[] {
    return result.listings;
  }

  public validateResult(result: ExtractionResult): boolean {
    return result.listings.length > 0;
  }
}
