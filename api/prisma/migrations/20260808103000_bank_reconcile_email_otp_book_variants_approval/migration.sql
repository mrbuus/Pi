-- Гараар бичсэн migration (2026-08-08).
--
-- ЯАГААД ГАРААР: `prisma migrate diff` нь migration түүх ба schema.prisma-гийн
-- хуучин зөрүүг (enum vs text, индексүүд) бүхэлд нь "засах" 82 үйлдэлтэй скрипт
-- санал болгосон — тэр нь ажиллаж буй прод дээр өгөгдөл алдагдуулах эрсдэлтэй.
-- Энэ файлд ЗӨВХӨН өнөөдрийн шинэ объектууд бий; хуучин зөрүүг тусад нь
-- төлөвлөж засна (STATUS.md-ийн нээлттэй ажил).

-- Банкны тулгалтын төлөв
CREATE TYPE "BankMatchStatus" AS ENUM ('UNMATCHED', 'AUTO_MATCHED', 'MANUAL_MATCHED', 'IGNORED');

-- Хаан банкны хуулгын мөрүүд
CREATE TABLE "BankTransaction" (
    "id" TEXT NOT NULL,
    "bankRef" TEXT NOT NULL,
    "bookedAt" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "accountNo" TEXT,
    "counterparty" TEXT,
    "matchStatus" "BankMatchStatus" NOT NULL DEFAULT 'UNMATCHED',
    "matchedUserId" TEXT,
    "paymentId" TEXT,
    "importedById" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawRow" JSONB NOT NULL,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BankTransaction_bankRef_key" ON "BankTransaction"("bankRef");
CREATE UNIQUE INDEX "BankTransaction_paymentId_key" ON "BankTransaction"("paymentId");
CREATE INDEX "BankTransaction_matchStatus_bookedAt_idx" ON "BankTransaction"("matchStatus", "bookedAt");
CREATE INDEX "BankTransaction_matchedUserId_idx" ON "BankTransaction"("matchedUserId");

ALTER TABLE "BankTransaction"
    ADD CONSTRAINT "BankTransaction_matchedUserId_fkey" FOREIGN KEY ("matchedUserId")
    REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankTransaction"
    ADD CONSTRAINT "BankTransaction_importedById_fkey" FOREIGN KEY ("importedById")
    REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Эцэг эх дүнтэй танилцсан баримт
CREATE TABLE "ResultAcknowledgement" (
    "id" TEXT NOT NULL,
    "testResultId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,

    CONSTRAINT "ResultAcknowledgement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResultAcknowledgement_testResultId_parentId_key"
    ON "ResultAcknowledgement"("testResultId", "parentId");
CREATE INDEX "ResultAcknowledgement_parentId_idx" ON "ResultAcknowledgement"("parentId");

ALTER TABLE "ResultAcknowledgement"
    ADD CONSTRAINT "ResultAcknowledgement_testResultId_fkey" FOREIGN KEY ("testResultId")
    REFERENCES "TestResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResultAcknowledgement"
    ADD CONSTRAINT "ResultAcknowledgement_parentId_fkey" FOREIGN KEY ("parentId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Имэйл OTP
CREATE TABLE "EmailOtp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailOtp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailOtp_userId_purpose_createdAt_idx" ON "EmailOtp"("userId", "purpose", "createdAt");

ALTER TABLE "EmailOtp"
    ADD CONSTRAINT "EmailOtp_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Хуучин SIE- кодын архив
CREATE TABLE "StudentCodeLegacy" (
    "userId" TEXT NOT NULL,
    "oldCode" TEXT NOT NULL,

    CONSTRAINT "StudentCodeLegacy_pkey" PRIMARY KEY ("userId")
);

-- Ном 2 хувилбараар: unique түлхүүрт includesVideo нэмэгдэнэ
ALTER TABLE "ProductItem" ADD COLUMN "includesVideo" BOOLEAN NOT NULL DEFAULT false;
-- Хуучин unique нь CONSTRAINT хэлбэрээр үүссэн (DROP INDEX болохгүй байсан)
ALTER TABLE "ProductItem" DROP CONSTRAINT "ProductItem_kind_refId_key";
CREATE UNIQUE INDEX "ProductItem_kind_refId_includesVideo_key"
    ON "ProductItem"("kind", "refId", "includesVideo");

-- Онлайнаар танхимын ангид бүртгүүлсний зөвшөөрлийн урсгал
ALTER TABLE "StudentProfile" ADD COLUMN "approvalPending" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StudentProfile" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "StudentProfile" ADD COLUMN "approvedById" TEXT;
CREATE INDEX "StudentProfile_approvalPending_idx" ON "StudentProfile"("approvalPending");
