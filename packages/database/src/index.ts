import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

export * from './generated/prisma/client.js';
export type * from './generated/prisma/models.js';

export function createPrismaClient(databaseUrl = process.env.DATABASE_URL): PrismaClient {
  if (databaseUrl === undefined || databaseUrl === '') {
    throw new Error('DATABASE_URL is required.');
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
}
