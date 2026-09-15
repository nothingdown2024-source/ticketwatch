import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { PinoNestLogger } from './pino-nest-logger.js';

const logger = new PinoNestLogger('worker');
const application = await NestFactory.createApplicationContext(AppModule, { logger });
application.enableShutdownHooks();
logger.log('TicketWatch worker started.');
