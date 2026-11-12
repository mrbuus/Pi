-- Сар бүрийн төлбөрийн хугацаа сунгах — зөвхөн нэмэх
CREATE TABLE IF NOT EXISTS "TuitionExtension" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    CONSTRAINT "TuitionExtension_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TuitionExtension_studentId_idx" ON "TuitionExtension"("studentId");
