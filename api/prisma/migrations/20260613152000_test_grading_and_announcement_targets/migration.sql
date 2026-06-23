-- Test grading mode prevents source-only/manual tests from being auto-scored with incomplete answer keys.
CREATE TYPE "TestGradingMode" AS ENUM ('AUTO', 'MANUAL');

ALTER TABLE "Test"
  ADD COLUMN "gradingMode" "TestGradingMode" NOT NULL DEFAULT 'AUTO';

-- Broaden announcements from center-wide/classroom-only to production-ready targeted audiences.
ALTER TYPE "AnnouncementAudience" ADD VALUE 'ALL_STUDENTS';
ALTER TYPE "AnnouncementAudience" ADD VALUE 'ALL_ONLINE';
ALTER TYPE "AnnouncementAudience" ADD VALUE 'SELECTED_CLASSROOMS';

CREATE TABLE "AnnouncementClassroomTarget" (
  "announcementId" TEXT NOT NULL,
  "classroomId" TEXT NOT NULL,

  CONSTRAINT "AnnouncementClassroomTarget_pkey" PRIMARY KEY ("announcementId", "classroomId")
);

CREATE INDEX "AnnouncementClassroomTarget_classroomId_idx"
  ON "AnnouncementClassroomTarget"("classroomId");

ALTER TABLE "AnnouncementClassroomTarget"
  ADD CONSTRAINT "AnnouncementClassroomTarget_announcementId_fkey"
  FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnnouncementClassroomTarget"
  ADD CONSTRAINT "AnnouncementClassroomTarget_classroomId_fkey"
  FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
