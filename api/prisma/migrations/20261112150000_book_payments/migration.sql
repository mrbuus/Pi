-- Номын мөнгө (эзэн 2026-11-12): сурагч × номын төлбөрийн бүртгэл.
-- Зөвхөн НЭМЭХ өөрчлөлт — одоо байгаа чек, тэмдэглэгээнд хүрэхгүй.

ALTER TABLE "ClassCheck" ADD COLUMN "bookKey" VARCHAR(24);

CREATE TABLE "BookPayment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "bookKey" VARCHAR(24) NOT NULL,
    "status" VARCHAR(8) NOT NULL,
    "amount" INTEGER,
    "classroomId" TEXT,
    "checkId" TEXT,
    "collectedById" TEXT,
    "note" VARCHAR(200),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "voidedById" TEXT,

    CONSTRAINT "BookPayment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BookPayment_studentId_bookKey_idx" ON "BookPayment"("studentId", "bookKey");
CREATE INDEX "BookPayment_classroomId_bookKey_idx" ON "BookPayment"("classroomId", "bookKey");
CREATE INDEX "BookPayment_collectedById_idx" ON "BookPayment"("collectedById");

-- Сурагч × номд идэвхтэй (хүчинтэй) мөр ганц л байна — зэрэг дарсан ч давхардахгүй
CREATE UNIQUE INDEX "BookPayment_active_key" ON "BookPayment"("studentId", "bookKey") WHERE "voidedAt" IS NULL;
