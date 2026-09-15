-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SourceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'UNSUPPORTED', 'BLOCKED', 'RATE_LIMITED', 'ADAPTER_BROKEN', 'DISABLED');

-- CreateEnum
CREATE TYPE "MonitorStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CLAIMED', 'DISABLED');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "ScanMode" AS ENUM ('HTTP', 'BROWSER');

-- CreateEnum
CREATE TYPE "ScanErrorCode" AS ENUM ('DNS_ERROR', 'CONNECTION_TIMEOUT', 'HTTP_TIMEOUT', 'HTTP_4XX', 'HTTP_5XX', 'RATE_LIMITED', 'BLOCKED', 'CONTENT_TOO_LARGE', 'INVALID_CONTENT', 'PARSER_FAILED', 'BROWSER_FAILED', 'ADAPTER_FAILED', 'UNSUPPORTED_SOURCE', 'SECURITY_REJECTED');

-- CreateEnum
CREATE TYPE "MatchMode" AS ENUM ('EXACT', 'CONTAINS', 'ALIASES', 'FUZZY');

-- CreateEnum
CREATE TYPE "WatchStatus" AS ENUM ('PENDING', 'SEARCHING', 'AVAILABLE', 'NOTIFIED', 'PAUSED', 'ERROR', 'DISABLED');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('UNKNOWN', 'NOT_AVAILABLE', 'AVAILABLE');

-- CreateEnum
CREATE TYPE "AvailabilityEventType" AS ENUM ('AVAILABILITY_OPENED', 'AVAILABILITY_CLOSED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('CONSOLE', 'WHATSAPP', 'EMAIL', 'TELEGRAM', 'PUSH');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "emailVerifiedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "displayName" VARCHAR(120) NOT NULL,
    "phoneE164" VARCHAR(20),
    "phoneVerifiedAt" TIMESTAMPTZ(3),
    "whatsappOptInAt" TIMESTAMPTZ(3),
    "whatsappOptOutAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(3),

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" UUID NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "normalizedUrl" TEXT NOT NULL,
    "fingerprint" CHAR(64) NOT NULL,
    "host" VARCHAR(255) NOT NULL,
    "adapterId" VARCHAR(100) NOT NULL,
    "displayName" VARCHAR(255),
    "status" "SourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceAdapterConfig" (
    "id" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "config" JSONB NOT NULL,
    "minimumIntervalSeconds" INTEGER NOT NULL DEFAULT 180,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SourceAdapterConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceMonitor" (
    "id" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "status" "MonitorStatus" NOT NULL DEFAULT 'ACTIVE',
    "intervalSeconds" INTEGER NOT NULL DEFAULT 180,
    "nextCheckAt" TIMESTAMPTZ(3) NOT NULL,
    "lastCheckAt" TIMESTAMPTZ(3),
    "lastSuccessAt" TIMESTAMPTZ(3),
    "claimedUntil" TIMESTAMPTZ(3),
    "claimedBy" VARCHAR(255),
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SourceMonitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scan" (
    "id" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "runKey" VARCHAR(255) NOT NULL,
    "correlationId" UUID NOT NULL,
    "status" "ScanStatus" NOT NULL,
    "mode" "ScanMode" NOT NULL,
    "adapterId" VARCHAR(100) NOT NULL,
    "contentHash" CHAR(64),
    "errorCode" "ScanErrorCode",
    "safeError" VARCHAR(500),
    "durationMs" INTEGER,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanSnapshot" (
    "id" UUID NOT NULL,
    "scanId" UUID NOT NULL,
    "sourceTitle" VARCHAR(255),
    "listingCount" INTEGER NOT NULL,
    "warnings" JSONB,
    "diagnostics" JSONB,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractedListing" (
    "id" UUID NOT NULL,
    "scanId" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "normalizedTitle" VARCHAR(255) NOT NULL,
    "aliases" TEXT[],
    "language" VARCHAR(80),
    "format" VARCHAR(40),
    "cinemaName" VARCHAR(255),
    "locationName" VARCHAR(255),
    "showDate" DATE,
    "showTime" VARCHAR(20),
    "bookingStatus" "AvailabilityStatus" NOT NULL,
    "bookingUrl" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "externalId" VARCHAR(255),
    "detectedAt" TIMESTAMPTZ(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "ExtractedListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchRule" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "query" VARCHAR(255) NOT NULL,
    "normalizedQuery" VARCHAR(255) NOT NULL,
    "matchMode" "MatchMode" NOT NULL,
    "fuzzyThreshold" DOUBLE PRECISION,
    "notificationChannel" "NotificationChannel" NOT NULL DEFAULT 'CONSOLE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "WatchRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchAlias" (
    "id" UUID NOT NULL,
    "watchRuleId" UUID NOT NULL,
    "alias" VARCHAR(255) NOT NULL,
    "normalizedAlias" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchState" (
    "id" UUID NOT NULL,
    "watchRuleId" UUID NOT NULL,
    "status" "WatchStatus" NOT NULL DEFAULT 'PENDING',
    "availability" "AvailabilityStatus" NOT NULL DEFAULT 'UNKNOWN',
    "occurrence" INTEGER NOT NULL DEFAULT 0,
    "lastEvaluatedAt" TIMESTAMPTZ(3),
    "lastMatchedAt" TIMESTAMPTZ(3),
    "lastMatchedListing" JSONB,
    "lastErrorCode" "ScanErrorCode",
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "WatchState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityEvent" (
    "id" UUID NOT NULL,
    "watchRuleId" UUID NOT NULL,
    "scanId" UUID NOT NULL,
    "matchedListingId" UUID,
    "type" "AvailabilityEventType" NOT NULL,
    "occurrence" INTEGER NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "AvailabilityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "availabilityEventId" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "idempotencyKey" CHAR(64) NOT NULL,
    "correlationId" UUID NOT NULL,
    "provider" VARCHAR(100),
    "providerMessageId" VARCHAR(255),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" VARCHAR(500),
    "queuedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "providerEventId" VARCHAR(255) NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" UUID NOT NULL,
    "provider" VARCHAR(100) NOT NULL,
    "providerEventId" VARCHAR(255) NOT NULL,
    "signatureValid" BOOLEAN NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "action" VARCHAR(120) NOT NULL,
    "entityType" VARCHAR(120) NOT NULL,
    "entityId" VARCHAR(255),
    "correlationId" UUID NOT NULL,
    "ipHash" CHAR(64),
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_phoneE164_key" ON "UserProfile"("phoneE164");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_userId_expiresAt_idx" ON "AuthSession"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_channel_key" ON "NotificationPreference"("userId", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "Source_fingerprint_key" ON "Source"("fingerprint");

-- CreateIndex
CREATE INDEX "Source_host_status_idx" ON "Source"("host", "status");

-- CreateIndex
CREATE INDEX "Source_adapterId_status_idx" ON "Source"("adapterId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SourceAdapterConfig_sourceId_key" ON "SourceAdapterConfig"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "SourceMonitor_sourceId_key" ON "SourceMonitor"("sourceId");

-- CreateIndex
CREATE INDEX "SourceMonitor_status_nextCheckAt_idx" ON "SourceMonitor"("status", "nextCheckAt");

-- CreateIndex
CREATE INDEX "SourceMonitor_claimedUntil_idx" ON "SourceMonitor"("claimedUntil");

-- CreateIndex
CREATE UNIQUE INDEX "Scan_runKey_key" ON "Scan"("runKey");

-- CreateIndex
CREATE INDEX "Scan_sourceId_createdAt_idx" ON "Scan"("sourceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Scan_status_createdAt_idx" ON "Scan"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScanSnapshot_scanId_key" ON "ScanSnapshot"("scanId");

-- CreateIndex
CREATE INDEX "ScanSnapshot_expiresAt_idx" ON "ScanSnapshot"("expiresAt");

-- CreateIndex
CREATE INDEX "ExtractedListing_scanId_normalizedTitle_idx" ON "ExtractedListing"("scanId", "normalizedTitle");

-- CreateIndex
CREATE INDEX "ExtractedListing_externalId_idx" ON "ExtractedListing"("externalId");

-- CreateIndex
CREATE INDEX "WatchRule_sourceId_deletedAt_idx" ON "WatchRule"("sourceId", "deletedAt");

-- CreateIndex
CREATE INDEX "WatchRule_userId_deletedAt_idx" ON "WatchRule"("userId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WatchAlias_watchRuleId_normalizedAlias_key" ON "WatchAlias"("watchRuleId", "normalizedAlias");

-- CreateIndex
CREATE UNIQUE INDEX "WatchState_watchRuleId_key" ON "WatchState"("watchRuleId");

-- CreateIndex
CREATE INDEX "AvailabilityEvent_watchRuleId_occurredAt_idx" ON "AvailabilityEvent"("watchRuleId", "occurredAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "AvailabilityEvent_watchRuleId_type_occurrence_key" ON "AvailabilityEvent"("watchRuleId", "type", "occurrence");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_idempotencyKey_key" ON "Notification"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Notification_status_createdAt_idx" ON "Notification"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_provider_providerMessageId_idx" ON "Notification"("provider", "providerMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationDelivery_providerEventId_key" ON "NotificationDelivery"("providerEventId");

-- CreateIndex
CREATE INDEX "NotificationDelivery_notificationId_occurredAt_idx" ON "NotificationDelivery"("notificationId", "occurredAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_processedAt_createdAt_idx" ON "WebhookEvent"("processedAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_providerEventId_key" ON "WebhookEvent"("provider", "providerEventId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceAdapterConfig" ADD CONSTRAINT "SourceAdapterConfig_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceMonitor" ADD CONSTRAINT "SourceMonitor_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanSnapshot" ADD CONSTRAINT "ScanSnapshot_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedListing" ADD CONSTRAINT "ExtractedListing_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchRule" ADD CONSTRAINT "WatchRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchRule" ADD CONSTRAINT "WatchRule_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchAlias" ADD CONSTRAINT "WatchAlias_watchRuleId_fkey" FOREIGN KEY ("watchRuleId") REFERENCES "WatchRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchState" ADD CONSTRAINT "WatchState_watchRuleId_fkey" FOREIGN KEY ("watchRuleId") REFERENCES "WatchRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityEvent" ADD CONSTRAINT "AvailabilityEvent_watchRuleId_fkey" FOREIGN KEY ("watchRuleId") REFERENCES "WatchRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityEvent" ADD CONSTRAINT "AvailabilityEvent_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityEvent" ADD CONSTRAINT "AvailabilityEvent_matchedListingId_fkey" FOREIGN KEY ("matchedListingId") REFERENCES "ExtractedListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_availabilityEventId_fkey" FOREIGN KEY ("availabilityEventId") REFERENCES "AvailabilityEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
