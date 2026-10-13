-- 1000 бодлогын шалгалт: TestType.THOUSAND, ангийн эргэн харалтын түвшин
-- (TestAccess.reviewLevel/reviewAutoAt), бодлогын YouTube холбоос.
-- Бүх алхам дахин ажиллуулахад унахгүй (deploy дунд тасарвал).

-- AlterEnum
ALTER TYPE "TestType" ADD VALUE IF NOT EXISTS 'THOUSAND';

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ReviewLevel" AS ENUM ('NONE', 'PROBLEMS', 'FULL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "Problem" ADD COLUMN IF NOT EXISTS "youtubeUrl" TEXT;

-- AlterTable
ALTER TABLE "TestAccess"
  ADD COLUMN IF NOT EXISTS "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "reviewLevel" "ReviewLevel" NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "reviewAutoAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reviewOpenedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reviewOpenedById" TEXT;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TestAccess_reviewOpenedById_fkey'
  ) THEN
    ALTER TABLE "TestAccess"
      ADD CONSTRAINT "TestAccess_reviewOpenedById_fkey"
      FOREIGN KEY ("reviewOpenedById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
