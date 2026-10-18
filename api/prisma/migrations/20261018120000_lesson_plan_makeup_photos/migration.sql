-- Хичээлийн төлөвлөгөө, ангиас хассан тест, онолын зураг, нөхөх хичээл (эзэн 2026-10-18).
-- Бүгд НЭМЭЛТ: хуучин мөрөнд нөлөөгүй.
ALTER TABLE "LessonTopic" ADD COLUMN IF NOT EXISTS "testIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "LessonTopic" ADD COLUMN IF NOT EXISTS "dismissMode" TEXT;
ALTER TABLE "LessonTopic" ADD COLUMN IF NOT EXISTS "photoStudentId" TEXT;

CREATE TABLE IF NOT EXISTS "ClassTestStatus" (
  "id" TEXT NOT NULL,
  "classroomId" TEXT NOT NULL,
  "testId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "note" TEXT,
  "updatedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClassTestStatus_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ClassTestStatus_classroomId_testId_key" ON "ClassTestStatus"("classroomId", "testId");
CREATE INDEX IF NOT EXISTS "ClassTestStatus_classroomId_idx" ON "ClassTestStatus"("classroomId");

CREATE TABLE IF NOT EXISTS "LessonPhoto" (
  "id" TEXT NOT NULL,
  "classroomId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "studentId" TEXT NOT NULL,
  "imageKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "testIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LessonPhoto_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LessonPhoto_classroomId_date_idx" ON "LessonPhoto"("classroomId", "date");
CREATE INDEX IF NOT EXISTS "LessonPhoto_studentId_idx" ON "LessonPhoto"("studentId");

CREATE TABLE IF NOT EXISTS "LessonMakeup" (
  "id" TEXT NOT NULL,
  "classroomId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "imageKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "submittedAt" TIMESTAMP(3),
  "confirmedById" TEXT,
  "confirmedAt" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LessonMakeup_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LessonMakeup_studentId_classroomId_date_key" ON "LessonMakeup"("studentId", "classroomId", "date");
CREATE INDEX IF NOT EXISTS "LessonMakeup_classroomId_date_idx" ON "LessonMakeup"("classroomId", "date");
