-- Буцаах ба өөрчлөлтийн түүх (docs/v2/BUTSAAH-TUUKH-TOLOVLOGOO.md):
--   ContentRevision — бодлого/тестийн хувилбар бүрийн бүрэн хуулбар
--   Problem/Test.version, updatedAt, updatedById — зэрэг засварын хамгаалалт (409)
-- Хуучин мөрд backfill ХИЙХГҮЙ: анх засахад хувилбар 0-ийг залхуугаар үүсгэнэ.
-- Зөвхөн НЭМЭХ; дахин ажиллуулахад унахгүй (deploy дунд тасарвал).

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "RevisionEntity" AS ENUM ('PROBLEM', 'TEST');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "RevisionAction" AS ENUM ('CREATE', 'UPDATE', 'RESTORE', 'IMPORT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable (PostgreSQL 11+: тогтмол DEFAULT-тай багана нэмэх нь мөр дахин бичихгүй)
ALTER TABLE "Problem"
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- AlterTable
ALTER TABLE "Test"
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ContentRevision" (
    "id" TEXT NOT NULL,
    "entity" "RevisionEntity" NOT NULL,
    "entityId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "action" "RevisionAction" NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ContentRevision_entity_entityId_version_key" ON "ContentRevision"("entity", "entityId", "version");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ContentRevision_entity_entityId_createdAt_idx" ON "ContentRevision"("entity", "entityId", "createdAt");
