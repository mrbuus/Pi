-- Өдрийн хичээлийн ахлах/туслах багш (зөвхөн НЭМЭХ, давтан ажиллахад аюулгүй)
CREATE TABLE IF NOT EXISTS "LessonStaffing" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "leadTeacherId" TEXT,
    "assistantTeacherId" TEXT,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LessonStaffing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LessonStaffing_scheduleId_date_key" ON "LessonStaffing"("scheduleId", "date");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LessonStaffing_scheduleId_fkey') THEN
    ALTER TABLE "LessonStaffing" ADD CONSTRAINT "LessonStaffing_scheduleId_fkey"
      FOREIGN KEY ("scheduleId") REFERENCES "ClassSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
