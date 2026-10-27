-- Google Sheet төлбөрийн синк (эзэн 2026-10-27). Зөвхөн НЭМЭХ — одоо байгаа
-- хүснэгтэд хүрэхгүй. Дахин ажиллуулахад унахгүй (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS "SheetSyncRun" (
  "id" TEXT NOT NULL,
  "trigger" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "ok" BOOLEAN NOT NULL DEFAULT false,
  "skipped" BOOLEAN NOT NULL DEFAULT false,
  "hash" TEXT,
  "stats" JSONB,
  "error" TEXT,
  CONSTRAINT "SheetSyncRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SheetSyncRun_startedAt_idx" ON "SheetSyncRun"("startedAt");

CREATE TABLE IF NOT EXISTS "SheetRow" (
  "id" TEXT NOT NULL,
  "tab" TEXT NOT NULL,
  "rowKey" TEXT NOT NULL,
  "rowNumber" INTEGER NOT NULL,
  "hash" TEXT NOT NULL,
  "cells" JSONB NOT NULL,
  "studentId" TEXT,
  "matchBy" TEXT,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "goneAt" TIMESTAMP(3),
  CONSTRAINT "SheetRow_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SheetRow_tab_rowKey_key" ON "SheetRow"("tab", "rowKey");
CREATE INDEX IF NOT EXISTS "SheetRow_studentId_idx" ON "SheetRow"("studentId");

CREATE TABLE IF NOT EXISTS "SheetRowVersion" (
  "id" TEXT NOT NULL,
  "sheetRowId" TEXT NOT NULL,
  "hash" TEXT NOT NULL,
  "cells" JSONB NOT NULL,
  "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SheetRowVersion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SheetRowVersion_sheetRowId_seenAt_idx" ON "SheetRowVersion"("sheetRowId", "seenAt");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SheetRowVersion_sheetRowId_fkey') THEN
    ALTER TABLE "SheetRowVersion" ADD CONSTRAINT "SheetRowVersion_sheetRowId_fkey"
      FOREIGN KEY ("sheetRowId") REFERENCES "SheetRow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "SheetIssue" (
  "id" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "tab" TEXT,
  "rowNumber" INTEGER,
  "studentId" TEXT,
  "title" TEXT NOT NULL,
  "detail" JSONB,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "SheetIssue_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SheetIssue_fingerprint_key" ON "SheetIssue"("fingerprint");
CREATE INDEX IF NOT EXISTS "SheetIssue_resolvedAt_severity_idx" ON "SheetIssue"("resolvedAt", "severity");
CREATE INDEX IF NOT EXISTS "SheetIssue_studentId_idx" ON "SheetIssue"("studentId");

CREATE TABLE IF NOT EXISTS "SheetPayment" (
  "paymentId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "cell" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SheetPayment_pkey" PRIMARY KEY ("paymentId")
);
CREATE INDEX IF NOT EXISTS "SheetPayment_studentId_cell_idx" ON "SheetPayment"("studentId", "cell");
