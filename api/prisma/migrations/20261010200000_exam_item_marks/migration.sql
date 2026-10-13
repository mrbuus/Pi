-- Шалгалтын нэгдсэн дүнгийн суурь (SHALGALT-TOLOVLOGOO §6):
--   TestItemMark  — бодлого/алхмын багц бүрийн зөв-буруу (онлайн, гар, Excel, OMR)
--   TestAbsence   — ирээгүй сурагч (дүн, дундажид тооцогдохгүй)
--   Problem.scoringGroups — 2-р хэсгийн алхмын багц
--   TestResult.version/regradeNote/updatedAt, AttemptSource.MANUAL_ENTRY
-- Зөвхөн НЭМЭХ; дахин ажиллуулахад унахгүй (deploy дунд тасарвал).

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ItemMarkStatus" AS ENUM ('CORRECT', 'WRONG', 'BLANK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ItemMarkSource" AS ENUM ('ONLINE', 'MANUAL', 'EXCEL', 'OMR');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterEnum
ALTER TYPE "AttemptSource" ADD VALUE IF NOT EXISTS 'MANUAL_ENTRY';

-- AlterTable
ALTER TABLE "Problem" ADD COLUMN IF NOT EXISTS "scoringGroups" JSONB;

-- AlterTable
ALTER TABLE "TestResult"
  ADD COLUMN IF NOT EXISTS "regradeNote" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE IF NOT EXISTS "TestItemMark" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "status" "ItemMarkStatus" NOT NULL,
    "source" "ItemMarkSource" NOT NULL,
    "enteredById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestItemMark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TestAbsence" (
    "testId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "markedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestAbsence_pkey" PRIMARY KEY ("testId","studentId")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TestItemMark_studentId_idx" ON "TestItemMark"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TestItemMark_testId_studentId_itemKey_key" ON "TestItemMark"("testId", "studentId", "itemKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TestAbsence_studentId_idx" ON "TestAbsence"("studentId");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TestItemMark_testId_fkey') THEN
    ALTER TABLE "TestItemMark" ADD CONSTRAINT "TestItemMark_testId_fkey"
      FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TestItemMark_studentId_fkey') THEN
    ALTER TABLE "TestItemMark" ADD CONSTRAINT "TestItemMark_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TestAbsence_testId_fkey') THEN
    ALTER TABLE "TestAbsence" ADD CONSTRAINT "TestAbsence_testId_fkey"
      FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TestAbsence_studentId_fkey') THEN
    ALTER TABLE "TestAbsence" ADD CONSTRAINT "TestAbsence_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
