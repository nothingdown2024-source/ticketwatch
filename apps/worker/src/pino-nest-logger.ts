import type { LoggerService } from '@nestjs/common';
import pino, { type Logger } from 'pino';

export class PinoNestLogger implements LoggerService {
  private readonly logger: Logger;

  public constructor(service: string) {
    this.logger = pino({
      level: process.env.LOG_LEVEL ?? 'info',
      base: { service, environment: process.env.NODE_ENV ?? 'development' },
    });
  }

  public log(message: unknown, context?: string): void {
    this.logger.info({ context, message });
  }
  public error(message: unknown, trace?: string, context?: string): void {
    if (message instanceof Error) this.logger.error({ context, trace, err: message }, message.message);
    else this.logger.error({ context, trace, message });
  }
  public warn(message: unknown, context?: string): void {
    this.logger.warn({ context, message });
  }
  public debug(message: unknown, context?: string): void {
    this.logger.debug({ context, message });
  }
  public verbose(message: unknown, context?: string): void {
    this.logger.trace({ context, message });
  }
  public fatal(message: unknown, context?: string): void {
    this.logger.fatal({ context, message });
  }
}
