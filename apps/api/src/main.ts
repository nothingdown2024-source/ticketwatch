import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { HttpErrorFilter } from './http-error.filter.js';
import { PinoNestLogger } from './pino-nest-logger.js';

const logger = new PinoNestLogger('api');
const app = await NestFactory.create(AppModule, { logger, rawBody: true });
app.use(helmet(process.env.NODE_ENV === 'production' ? {} : { contentSecurityPolicy: false }));
app.use(cookieParser());
app.use((request: Request, response: Response, next: NextFunction) => {
  request.headers['x-request-id'] ??= randomUUID();
  response.setHeader('x-request-id', request.headers['x-request-id']);
  next();
});
app.enableCors({
  origin: process.env.APP_URL ?? 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
});
app.useGlobalPipes(
  new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
);
app.useGlobalFilters(new HttpErrorFilter());
app.setGlobalPrefix('api/v1');
// API documentation is useful locally, but should not disclose the application
// surface area on a public production host unless an administrator opts in.
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_API_DOCS === 'true') {
  const openApi = new DocumentBuilder()
    .setTitle('TicketWatch API')
    .setVersion('1.0')
    .addCookieAuth('ticketwatch_session')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, openApi));
}
app.enableShutdownHooks();
await app.listen(Number(process.env.PORT ?? 4000), '0.0.0.0');
