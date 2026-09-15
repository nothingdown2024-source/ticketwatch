# TicketWatch

TicketWatch is a source-deduplicated movie-ticket availability monitor. Users create an
alert once; the platform checks each unique public source on a shared schedule and notifies
subscribers only when availability meaningfully changes.

> Stop refreshing. Know when tickets open.

The first milestone is an end-to-end local DemoAdapter flow. It deliberately does not automate
checkout, bypass CAPTCHAs, use private accounts, or defeat third-party protections.

## Architecture

- `apps/web`: Next.js App Router user and admin interface.
- `apps/api`: NestJS versioned REST API, authentication, authorization, previews, and alerts.
- `apps/worker`: NestJS/BullMQ dispatcher, source scan, matching, and notification workers.
- `packages/database`: Prisma/PostgreSQL schema, migrations, client, and seed.
- `packages/shared`: domain types, title matching, state transitions, hashing, and idempotency.
- `packages/scraper-core`: safe URL policy, adapter registry, DemoAdapter, and HTTP-first scanners.
- `packages/notification-core`: provider abstraction, console provider, and WhatsApp Cloud adapter.

One canonical `Source` has one active `SourceMonitor` and many user `WatchRule`s. The dispatcher
queues one scan for a due source, never one scan per subscriber.

See [architecture](docs/architecture.md), [domain model](docs/domain-model.md),
[security](docs/security.md), and [adapter development](docs/adapter-development.md).

## Requirements

- Node.js 22.12 or newer
- pnpm 11
- Docker with Compose, or reachable PostgreSQL 17 and Redis 8 services

## Local setup

```bash
pnpm install
copy .env.example .env
docker compose up -d
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open the web UI at `http://localhost:3000`, API at `http://localhost:4000/api/v1`, and
Swagger at `http://localhost:4000/docs`. The development seed creates the documented demo
accounts and a source backed by local fixtures—CI never contacts a cinema site.

To simulate ticket availability, call the development-only demo-fixture endpoint or use the
admin control in the local UI. The next scan changes the watch from `SEARCHING` to `AVAILABLE`
and the console provider persists exactly one notification.

## Commands

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:integration
pnpm test:e2e
```

Integration and E2E suites require PostgreSQL and Redis. Unit and contract suites are hermetic.

## Environment and secrets

Copy `.env.example`; never commit `.env`. Production requires a 32+ character `AUTH_SECRET`,
restricted CORS origins, TLS, and explicit supported-host configuration. `GENERIC_SCANNING_ENABLED`
defaults off. WhatsApp credentials are optional in development because the console provider is
fully functional.

For the official WhatsApp Cloud API, configure the token, phone-number ID, webhook verify token,
approved template name, and template language. Provider acceptance means `SENT`; delivery/read
states only come from signed webhook updates.

## Deployment

Deploy web, API, and worker as separate processes against managed PostgreSQL and Redis. Scale
workers independently. Browser scans are isolated behind the scanner interface so they can move
to a dedicated worker pool. See the architecture and security documents before enabling any
non-demo adapter.
