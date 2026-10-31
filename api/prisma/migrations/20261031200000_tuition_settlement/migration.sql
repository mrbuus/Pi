-- Гараар «бүтэн жил» гэж тооцох (эзэн 2026-10-31). Зөвхөн НЭМЭХ — одоо байгаа
-- хүснэгтэд хүрэхгүй. Дахин ажиллуулахад унахгүй (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS "TuitionSettlement" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "year" TEXT NOT NULL,
  "note" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "revokedById" TEXT,
  CONSTRAINT "TuitionSettlement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TuitionSettlement_year_studentId_idx" ON "TuitionSettlement"("year", "studentId");
