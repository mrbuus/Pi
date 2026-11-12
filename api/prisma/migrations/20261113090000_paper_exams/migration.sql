-- Нэгдсэн шалгалт (төвийн цаасан шалгалт: OMR / Excel) — зөвхөн шинэ хүснэгт нэмнэ, одоо байгааг
-- хөндөхгүй (docs/PLAN-OMR.md). Идемпотент: deploy дунд тасарч дахин ажиллахад унахгүй (STATUS §4).
-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaperExamImportStatus') THEN
    CREATE TYPE "PaperExamImportStatus" AS ENUM ('CONFIRMED', 'REVERTED');
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PaperExam" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "heldOn" DATE NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PaperExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PaperExamItem" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "answerKey" TEXT,
    "points" INTEGER NOT NULL DEFAULT 1,
    "area" TEXT,
    "topic" TEXT,
    "formulaSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "voided" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PaperExamItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PaperExamSheet" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "studentId" TEXT,
    "rawCode" TEXT NOT NULL,
    "rawLastName" TEXT NOT NULL,
    "rawFirstName" TEXT NOT NULL,
    "groupLabel" TEXT NOT NULL,
    "groupTeacher" TEXT,
    "classroomId" TEXT,
    "answers" JSONB NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "supersededAt" TIMESTAMP(3),
    "supersededByImportId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaperExamSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PaperExamImport" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSha256" TEXT NOT NULL,
    "sheetCount" INTEGER NOT NULL,
    "matchedCount" INTEGER NOT NULL,
    "status" "PaperExamImportStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revertedAt" TIMESTAMP(3),
    "revertedById" TEXT,

    CONSTRAINT "PaperExamImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaperExam_deletedAt_heldOn_idx" ON "PaperExam"("deletedAt", "heldOn");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PaperExamItem_examId_number_key" ON "PaperExamItem"("examId", "number");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaperExamSheet_examId_supersededAt_idx" ON "PaperExamSheet"("examId", "supersededAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaperExamSheet_studentId_idx" ON "PaperExamSheet"("studentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaperExamSheet_importId_idx" ON "PaperExamSheet"("importId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PaperExamSheet_active_student_key" ON "PaperExamSheet"("examId", "studentId") WHERE ("supersededAt" IS NULL);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaperExamImport_examId_createdAt_idx" ON "PaperExamImport"("examId", "createdAt");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaperExamItem_examId_fkey') THEN
    ALTER TABLE "PaperExamItem" ADD CONSTRAINT "PaperExamItem_examId_fkey" FOREIGN KEY ("examId") REFERENCES "PaperExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaperExamSheet_examId_fkey') THEN
    ALTER TABLE "PaperExamSheet" ADD CONSTRAINT "PaperExamSheet_examId_fkey" FOREIGN KEY ("examId") REFERENCES "PaperExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaperExamSheet_importId_fkey') THEN
    ALTER TABLE "PaperExamSheet" ADD CONSTRAINT "PaperExamSheet_importId_fkey" FOREIGN KEY ("importId") REFERENCES "PaperExamImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaperExamSheet_studentId_fkey') THEN
    ALTER TABLE "PaperExamSheet" ADD CONSTRAINT "PaperExamSheet_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaperExamImport_examId_fkey') THEN
    ALTER TABLE "PaperExamImport" ADD CONSTRAINT "PaperExamImport_examId_fkey" FOREIGN KEY ("examId") REFERENCES "PaperExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
