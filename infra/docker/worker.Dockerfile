FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/notification-core/package.json packages/notification-core/package.json
COPY packages/scraper-core/package.json packages/scraper-core/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile
COPY apps/worker apps/worker
COPY packages/database packages/database
COPY packages/notification-core packages/notification-core
COPY packages/scraper-core packages/scraper-core
COPY packages/shared packages/shared
RUN pnpm db:generate && pnpm --filter @ticketwatch/shared build && pnpm --filter @ticketwatch/scraper-core build && pnpm --filter @ticketwatch/notification-core build && pnpm --filter @ticketwatch/database build && pnpm --filter @ticketwatch/worker build

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app /app
USER node
CMD ["node", "apps/worker/dist/main.js"]

