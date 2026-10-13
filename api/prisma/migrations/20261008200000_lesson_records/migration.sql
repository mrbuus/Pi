-- Батлагдсан хичээлийн түүх + багшийн тайлбар (зөвхөн НЭМЭХ, давтан ажиллахад аюулгүй)
CREATE TABLE IF NOT EXISTS "LessonRecord" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "classroomName" TEXT NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "room" TEXT,
    "topic" TEXT,
    "leadTeacherId" TEXT,
    "leadTeacherName" TEXT,
    "assistantTeacherId" TEXT,
    "assistantTeacherName" TEXT,
    "tests" JSONB NOT NULL DEFAULT '[]',
    "testCount" INTEGER NOT NULL DEFAULT 0,
    "enrolledCount" INTEGER NOT NULL DEFAULT 0,
    "presentCount" INTEGER NOT NULL DEFAULT 0,
    "absentCount" INTEGER NOT NULL DEFAULT 0,
    "attendanceMarked" INTEGER NOT NULL DEFAULT 0,
    "confirmedById" TEXT NOT NULL,
    "confirmedByName" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LessonRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LessonRecord_scheduleId_date_key" ON "LessonRecord"("scheduleId", "date");
CREATE INDEX IF NOT EXISTS "LessonRecord_classroomId_date_idx" ON "LessonRecord"("classroomId", "date");
CREATE INDEX IF NOT EXISTS "LessonRecord_date_idx" ON "LessonRecord"("date");

CREATE TABLE IF NOT EXISTS "LessonRecordStudent" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "attendance" TEXT,
    CONSTRAINT "LessonRecordStudent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LessonRecordStudent_recordId_studentId_key" ON "LessonRecordStudent"("recordId", "studentId");
CREATE INDEX IF NOT EXISTS "LessonRecordStudent_studentId_idx" ON "LessonRecordStudent"("studentId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LessonRecordStudent_recordId_fkey') THEN
    ALTER TABLE "LessonRecordStudent" ADD CONSTRAINT "LessonRecordStudent_recordId_fkey"
      FOREIGN KEY ("recordId") REFERENCES "LessonRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "LessonNote" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "body" VARCHAR(500) NOT NULL,
    "updatedById" TEXT NOT NULL,
    "updatedByName" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LessonNote_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LessonNote_scheduleId_date_key" ON "LessonNote"("scheduleId", "date");
