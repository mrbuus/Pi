-- Гэрийн даалгаврын онлайн бодолт + зураг (эзэн 2026-10-29). Зөвхөн НЭМЭХ —
-- одоо байгаа хүснэгтэд хүрэхгүй. Дахин ажиллуулахад унахгүй (IF NOT EXISTS).

DO $$ BEGIN
  CREATE TYPE "HomeworkAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "HomeworkAttempt" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "classroomId" TEXT NOT NULL,
  "testId" TEXT NOT NULL,
  "lessonDate" DATE NOT NULL,
  "status" "HomeworkAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deadlineAt" TIMESTAMP(3),
  "timeLimitMin" INTEGER,
  "answers" JSONB NOT NULL DEFAULT '{}',
  "firstAnswers" JSONB,
  "checksUsed" INTEGER NOT NULL DEFAULT 0,
  "score" INTEGER,
  "total" INTEGER,
  "submittedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HomeworkAttempt_pkey" PRIMARY KEY ("id")
);
-- Хүснэгт өмнө нь (локал туршилтад) баганагүй үүссэн бол нэмнэ
ALTER TABLE "HomeworkAttempt" ADD COLUMN IF NOT EXISTS "timeLimitMin" INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS "HomeworkAttempt_studentId_testId_lessonDate_key"
  ON "HomeworkAttempt"("studentId", "testId", "lessonDate");
CREATE INDEX IF NOT EXISTS "HomeworkAttempt_classroomId_lessonDate_idx"
  ON "HomeworkAttempt"("classroomId", "lessonDate");

CREATE TABLE IF NOT EXISTS "HomeworkCheck" (
  "id" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "n" INTEGER NOT NULL,
  "answers" JSONB NOT NULL,
  "results" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HomeworkCheck_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "HomeworkCheck_attemptId_n_key"
  ON "HomeworkCheck"("attemptId", "n");
DO $$ BEGIN
  ALTER TABLE "HomeworkCheck" ADD CONSTRAINT "HomeworkCheck_attemptId_fkey"
    FOREIGN KEY ("attemptId") REFERENCES "HomeworkAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "HomeworkPhoto" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "classroomId" TEXT NOT NULL,
  "lessonDate" DATE NOT NULL,
  "fileKey" TEXT NOT NULL,
  "pages" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "HomeworkPhoto_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "HomeworkPhoto_studentId_classroomId_lessonDate_idx"
  ON "HomeworkPhoto"("studentId", "classroomId", "lessonDate");
CREATE INDEX IF NOT EXISTS "HomeworkPhoto_classroomId_lessonDate_idx"
  ON "HomeworkPhoto"("classroomId", "lessonDate");
CREATE INDEX IF NOT EXISTS "HomeworkPhoto_fileKey_idx" ON "HomeworkPhoto"("fileKey");
