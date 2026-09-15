import type { ScanErrorCode } from './types.js';

export class ScanError extends Error {
  public constructor(
    public readonly code: ScanErrorCode,
    message: string,
    public readonly retryable: boolean,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ScanError';
  }
}
