import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  public catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error.';
    const message =
      typeof raw === 'string'
        ? raw
        : ((raw as { message?: string | string[] }).message ?? 'Request failed.');
    response.status(status).json({
      error: {
        status,
        code: status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
        message,
        requestId: request.header('x-request-id') ?? null,
      },
    });
  }
}
