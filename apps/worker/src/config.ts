export interface WorkerConfig {
  redisUrl: string;
  dispatchIntervalSeconds: number;
  defaultScanIntervalSeconds: number;
  scanJitterSeconds: number;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed <= 0)
    throw new Error(`Expected a positive integer, received ${value}.`);
  return parsed;
}

export function loadWorkerConfig(): WorkerConfig {
  return {
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
    dispatchIntervalSeconds: positiveInteger(process.env.DISPATCH_INTERVAL_SECONDS, 15),
    defaultScanIntervalSeconds: positiveInteger(process.env.DEFAULT_SCAN_INTERVAL_SECONDS, 180),
    scanJitterSeconds: positiveInteger(process.env.SCAN_JITTER_SECONDS, 15),
  };
}
