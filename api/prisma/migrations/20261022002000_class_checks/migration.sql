-- «Чек» — ангийн нэртэй шалгах жагсаалт (эзэн 2026-10-22). Зөвхөн НЭМЭХ.
-- ClassCheck: «Номны мөнгө 25,000₮» гэх мэт; хаах нь зөөлөн (archivedAt).
-- ClassCheckMark: сурагч бүрийн +/− — (checkId, studentId) давхардахгүй (upsert).

CREATE TABLE IF NOT EXISTS "ClassCheck" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "amount" INTEGER,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),
    "archivedById" TEXT,
    CONSTRAINT "ClassCheck_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ClassCheck_classroomId_archivedAt_idx" ON "ClassCheck"("classroomId", "archivedAt");

CREATE TABLE IF NOT EXISTS "ClassCheckMark" (
    "id" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClassCheckMark_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClassCheckMark_checkId_studentId_key" ON "ClassCheckMark"("checkId", "studentId");
CREATE INDEX IF NOT EXISTS "ClassCheckMark_studentId_idx" ON "ClassCheckMark"("studentId");

DO $$
BEGIN
    -- Анги устгавал түүний чек устна (анги ихэвчлэн archived — устгах нь зөвхөн тест/цэвэрлэгээнд)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClassCheck_classroomId_fkey') THEN
        ALTER TABLE "ClassCheck" ADD CONSTRAINT "ClassCheck_classroomId_fkey"
            FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClassCheckMark_checkId_fkey') THEN
        ALTER TABLE "ClassCheckMark" ADD CONSTRAINT "ClassCheckMark_checkId_fkey"
            FOREIGN KEY ("checkId") REFERENCES "ClassCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClassCheckMark_studentId_fkey') THEN
        ALTER TABLE "ClassCheckMark" ADD CONSTRAINT "ClassCheckMark_studentId_fkey"
            FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
