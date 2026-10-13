-- Онцгой өдрийг аль ангид хамаарахаар сонгох (хоосон = бүх анги).
-- Нэг өдөрт өөр өөр ангийн бичлэг байж болохоор date-ийн unique-ийг арилгана.
DROP INDEX IF EXISTS "AcademicCalendarDay_date_key";
CREATE INDEX IF NOT EXISTS "AcademicCalendarDay_date_idx" ON "AcademicCalendarDay"("date");

CREATE TABLE IF NOT EXISTS "AcademicCalendarDayClassroom" (
    "calendarDayId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    CONSTRAINT "AcademicCalendarDayClassroom_pkey" PRIMARY KEY ("calendarDayId","classroomId")
);

CREATE INDEX IF NOT EXISTS "AcademicCalendarDayClassroom_classroomId_idx" ON "AcademicCalendarDayClassroom"("classroomId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AcademicCalendarDayClassroom_calendarDayId_fkey') THEN
    ALTER TABLE "AcademicCalendarDayClassroom" ADD CONSTRAINT "AcademicCalendarDayClassroom_calendarDayId_fkey"
      FOREIGN KEY ("calendarDayId") REFERENCES "AcademicCalendarDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AcademicCalendarDayClassroom_classroomId_fkey') THEN
    ALTER TABLE "AcademicCalendarDayClassroom" ADD CONSTRAINT "AcademicCalendarDayClassroom_classroomId_fkey"
      FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
