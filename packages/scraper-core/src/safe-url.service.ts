import { lookup } from 'node:dns/promises';
import ipaddr from 'ipaddr.js';
import { ScanError } from '@ticketwatch/shared';

export interface SafeUrlOptions {
  allowedHosts: readonly string[];
  genericScanningEnabled: boolean;
  allowedPorts?: readonly number[];
}

export interface ValidatedUrl {
  url: URL;
  addresses: string[];
}

const LOCAL_HOSTS = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'metadata.google.internal',
]);

function isPublicAddress(address: string): boolean {
  let parsed: ipaddr.IPv4 | ipaddr.IPv6;
  try {
    parsed = ipaddr.parse(address);
  } catch {
    return false;
  }
  if (parsed.kind() === 'ipv6') {
    const ipv6 = parsed as ipaddr.IPv6;
    if (ipv6.isIPv4MappedAddress()) parsed = ipv6.toIPv4Address();
  }
  return parsed.range() === 'unicast';
}

function hostAllowed(hostname: string, allowedHosts: readonly string[]): boolean {
  const host = hostname.toLowerCase();
  return allowedHosts.some((configured) => {
    const allowed = configured.toLowerCase().replace(/^\*\./u, '');
    return host === allowed || (configured.startsWith('*.') && host.endsWith(`.${allowed}`));
  });
}

export class SafeUrlService {
  private readonly allowedPorts: ReadonlySet<number>;

  public constructor(private readonly options: SafeUrlOptions) {
    this.allowedPorts = new Set(options.allowedPorts ?? [80, 443]);
  }

  public async validate(rawUrl: string): Promise<ValidatedUrl> {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch (error) {
      throw new ScanError('SECURITY_REJECTED', 'The source URL is invalid.', false, {
        cause: error,
      });
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new ScanError('SECURITY_REJECTED', 'Only HTTP and HTTPS sources are allowed.', false);
    }
    if (url.username !== '' || url.password !== '') {
      throw new ScanError(
        'SECURITY_REJECTED',
        'URLs containing credentials are not allowed.',
        false,
      );
    }
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/gu, '');
    if (
      LOCAL_HOSTS.has(hostname) ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local')
    ) {
      throw new ScanError('SECURITY_REJECTED', 'Local network sources are not allowed.', false);
    }
    const port = url.port === '' ? (url.protocol === 'https:' ? 443 : 80) : Number(url.port);
    if (!Number.isInteger(port) || !this.allowedPorts.has(port)) {
      throw new ScanError('SECURITY_REJECTED', 'The source port is not allowed.', false);
    }
    if (ipaddr.isValid(hostname) && !isPublicAddress(hostname)) {
      throw new ScanError(
        'SECURITY_REJECTED',
        'The source resolves to a non-public address.',
        false,
      );
    }
    if (!this.options.genericScanningEnabled && !hostAllowed(hostname, this.options.allowedHosts)) {
      throw new ScanError('UNSUPPORTED_SOURCE', 'This website is not currently supported.', false);
    }

    let records: Array<{ address: string; family: number }>;
    try {
      records = (await lookup(hostname, { all: true, verbatim: true })) as Array<{
        address: string;
        family: number;
      }>;
    } catch (error) {
      throw new ScanError('DNS_ERROR', 'The source hostname could not be resolved.', true, {
        cause: error,
      });
    }
    const addresses = [...new Set(records.map(({ address }) => address))];
    if (addresses.length === 0 || addresses.some((address) => !isPublicAddress(address))) {
      throw new ScanError(
        'SECURITY_REJECTED',
        'The source resolves to a non-public address.',
        false,
      );
    }
    return { url, addresses };
  }
}

export const safeUrlInternals = { isPublicAddress, hostAllowed };
