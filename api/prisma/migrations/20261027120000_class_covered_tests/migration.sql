-- «Өмнө үзсэн сэдэв» (эзэн 2026-10-27): систем эхлэхээс өмнө анги үзсэн тестийг
-- ОГНООГҮЙгээр тэмдэглэнэ. Хасах нь зөөлөн (removedAt) — мөр хэзээ ч устахгүй.
-- Огноотой үзсэн тест ClassTestSession-д хэвээр. Зөвхөн НЭМЭХ.

CREATE TABLE IF NOT EXISTS "ClassCoveredTest" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "chapterId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'PAST',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    "removedById" TEXT,
    CONSTRAINT "ClassCoveredTest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClassCoveredTest_classroomId_testId_key" ON "ClassCoveredTest"("classroomId", "testId");
CREATE INDEX IF NOT EXISTS "ClassCoveredTest_classroomId_removedAt_idx" ON "ClassCoveredTest"("classroomId", "removedAt");
CREATE INDEX IF NOT EXISTS "ClassCoveredTest_testId_idx" ON "ClassCoveredTest"("testId");
