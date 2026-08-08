-- Migration: Add SMS logging, templates, and batch models
-- Description: Add comprehensive SMS recording, template, and batch sending support

-- Create enums (PostgreSQL only)
CREATE TYPE "SmsStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'CANCELLED');
CREATE TYPE "SmsKind" AS ENUM ('PASSWORD_RESET', 'ANNOUNCEMENT', 'PAYMENT_REMINDER', 'ATTENDANCE', 'EXAM', 'MANUAL', 'OTHER');
CREATE TYPE "SmsBatchStatus" AS ENUM ('DRAFT', 'SENDING', 'DONE', 'CANCELLED');

-- Create SmsTemplate table
CREATE TABLE IF NOT EXISTS "SmsTemplate" (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  kind "SmsKind" NOT NULL,
  body TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SmsTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create SmsBatch table
CREATE TABLE IF NOT EXISTS "SmsBatch" (
  id TEXT NOT NULL PRIMARY KEY,
  title TEXT NOT NULL,
  kind "SmsKind" NOT NULL,
  total INTEGER NOT NULL,
  sent INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  status "SmsBatchStatus" NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "SmsBatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create SmsMessage table
CREATE TABLE IF NOT EXISTS "SmsMessage" (
  id TEXT NOT NULL PRIMARY KEY,
  "toPhone" TEXT NOT NULL,
  body TEXT NOT NULL,
  status "SmsStatus" NOT NULL,
  kind "SmsKind" NOT NULL,
  "userId" TEXT,
  "batchId" TEXT,
  "templateId" TEXT,
  provider TEXT,
  "providerRef" TEXT,
  error TEXT,
  segments INTEGER NOT NULL DEFAULT 1,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  CONSTRAINT "SmsMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "SmsMessage_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "SmsBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "SmsMessage_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SmsTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "SmsMessage_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create indexes for query optimization
CREATE INDEX IF NOT EXISTS "SmsMessage_toPhone_idx" ON "SmsMessage"("toPhone");
CREATE INDEX IF NOT EXISTS "SmsMessage_status_idx" ON "SmsMessage"(status);
CREATE INDEX IF NOT EXISTS "SmsMessage_batchId_idx" ON "SmsMessage"("batchId");
CREATE INDEX IF NOT EXISTS "SmsMessage_createdAt_idx" ON "SmsMessage"("createdAt");
