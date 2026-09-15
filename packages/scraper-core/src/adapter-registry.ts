import { ScanError } from '@ticketwatch/shared';
import type { TicketSourceAdapter } from './contracts.js';

export class AdapterRegistry {
  public constructor(
    private readonly adapters: readonly TicketSourceAdapter[],
    private readonly genericEnabled = false,
  ) {}

  public detect(url: URL): TicketSourceAdapter {
    const adapter = this.adapters.find(
      (candidate) => candidate.id !== 'generic' && candidate.detect(url),
    );
    if (adapter !== undefined) return adapter;
    if (this.genericEnabled) {
      const generic = this.adapters.find((candidate) => candidate.id === 'generic');
      if (generic !== undefined) return generic;
    }
    throw new ScanError('UNSUPPORTED_SOURCE', 'This website is not currently supported.', false);
  }
}
