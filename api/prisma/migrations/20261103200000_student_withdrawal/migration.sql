-- Сургалтаас хасах үеийн төлбөрийн тооцоо (шинэ хүснэгт, одоо байгаа өгөгдөлд хүрэхгүй)
CREATE TABLE "StudentWithdrawal" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classroomId" TEXT,
    "leftOn" DATE NOT NULL,
    "countFrom" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "owed" INTEGER NOT NULL,
    "paid" INTEGER NOT NULL,
    "refund" INTEGER NOT NULL,
    "detail" JSONB NOT NULL,
    "refundId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentWithdrawal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudentWithdrawal_studentId_createdAt_idx" ON "StudentWithdrawal"("studentId", "createdAt");
