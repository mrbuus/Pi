-- Нөхөлт (эзэн 2026-11-08): өөр ангид суусан эсвэл 406 өрөөнд нөхсөн бүртгэл.
-- Зөвхөн ШИНЭ хүснэгт нэмнэ — одоо байгаа мөр, өгөгдөлд хүрэхгүй.
-- Дахин ажиллуулахад унахгүй (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS "MakeupVisit" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hostClassroomId" TEXT,
    "placeKey" TEXT NOT NULL,
    "homeClassroomId" TEXT,
    "comment" VARCHAR(500),
    "attStatus" "AttendanceStatus",
    "lateRange" "LateRange",
    "attNote" VARCHAR(200),
    "hwStatus" "HomeworkMarkStatus",
    "hwNote" VARCHAR(200),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "MakeupVisit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MakeupVisitTest" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "testId" TEXT,
    "title" VARCHAR(200) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "MakeupVisitTest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MakeupVisit_placeKey_date_idx" ON "MakeupVisit"("placeKey", "date");
CREATE INDEX IF NOT EXISTS "MakeupVisit_homeClassroomId_date_idx" ON "MakeupVisit"("homeClassroomId", "date");
CREATE INDEX IF NOT EXISTS "MakeupVisit_studentId_date_idx" ON "MakeupVisit"("studentId", "date");
-- Давхардалгүй: нэг сурагч, нэг өдөр, нэг газар — зөвхөн идэвхтэй (устгаагүй) мөрүүд дунд
CREATE UNIQUE INDEX IF NOT EXISTS "MakeupVisit_studentId_date_placeKey_key"
  ON "MakeupVisit"("studentId", "date", "placeKey") WHERE ("deletedAt" IS NULL);
CREATE INDEX IF NOT EXISTS "MakeupVisitTest_visitId_idx" ON "MakeupVisitTest"("visitId");
CREATE INDEX IF NOT EXISTS "MakeupVisitTest_testId_idx" ON "MakeupVisitTest"("testId");

DO $$ BEGIN
  ALTER TABLE "MakeupVisitTest" ADD CONSTRAINT "MakeupVisitTest_visitId_fkey"
    FOREIGN KEY ("visitId") REFERENCES "MakeupVisit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
