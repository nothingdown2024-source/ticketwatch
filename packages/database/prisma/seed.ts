import { randomBytes, createHash } from 'node:crypto';
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { hash } from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl === undefined) throw new Error('DATABASE_URL is required.');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

const sourceUrl = 'https://demo.ticketwatch.local/cinema/hyderabad';
const sourceFingerprint = createHash('sha256').update(`demo:${sourceUrl}`).digest('hex');

async function main(): Promise<void> {
  const passwordHash = await hash('DemoPassword!123');
  const user = await prisma.user.upsert({
    where: { email: 'demo@ticketwatch.local' },
    update: {},
    create: {
      email: 'demo@ticketwatch.local',
      passwordHash,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          displayName: 'Demo User',
          phoneE164: '+919999999999',
          phoneVerifiedAt: new Date(),
          whatsappOptInAt: new Date(),
        },
      },
      notificationPreferences: {
        create: [
          { channel: 'CONSOLE', enabled: true },
          { channel: 'WHATSAPP', enabled: false },
        ],
      },
    },
  });
  const source = await prisma.source.upsert({
    where: { fingerprint: sourceFingerprint },
    update: {},
    create: {
      originalUrl: sourceUrl,
      normalizedUrl: sourceUrl,
      fingerprint: sourceFingerprint,
      host: 'demo.ticketwatch.local',
      adapterId: 'demo',
      displayName: 'Demo Cinema — Hyderabad',
      adapterConfig: {
        create: { config: { fixtureState: 'state-1' }, minimumIntervalSeconds: 15 },
      },
      monitor: { create: { intervalSeconds: 15, nextCheckAt: new Date() } },
    },
  });
  await prisma.watchRule.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      userId: user.id,
      sourceId: source.id,
      query: 'Avatar Fire and Ash',
      normalizedQuery: 'avatar fire and ash',
      matchMode: 'ALIASES',
      notificationChannel: 'CONSOLE',
      aliases: { create: [{ alias: 'Avatar 3', normalizedAlias: 'avatar 3' }] },
      state: { create: { status: 'SEARCHING', availability: 'NOT_AVAILABLE' } },
    },
  });
  const sessionToken = randomBytes(32).toString('base64url');
  console.info(
    JSON.stringify({
      event: 'seed_complete',
      demoEmail: user.email,
      demoPassword: 'DemoPassword!123',
      oneTimeSessionExample: sessionToken,
    }),
  );
}

await main().finally(async () => prisma.$disconnect());
