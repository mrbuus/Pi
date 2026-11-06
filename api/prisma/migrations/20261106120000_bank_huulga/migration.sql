-- Банкны хуулга → хүүхдийн төлбөр (эзэн 2026-11-05). Зөвхөн НЭМЭХ: хуучин
-- багана/мөр устгахгүй. Прод дээр BankTransaction хоосон (0 мөр, 2026-11-05).

DO $$ BEGIN
  CREATE TYPE "BankDirection" AS ENUM ('CREDIT', 'DEBIT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "BankAllocKind" AS ENUM ('TUITION', 'BOOK', 'ANSWER_SHEET', 'STAFF_FINE', 'TRANSFER', 'EXPENSE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "BankTransaction" ADD COLUMN IF NOT EXISTS "direction" "BankDirection" NOT NULL DEFAULT 'CREDIT';
ALTER TABLE "BankTransaction" ADD COLUMN IF NOT EXISTS "closingBalance" TEXT;
ALTER TABLE "BankTransaction" ADD COLUMN IF NOT EXISTS "suggestion" JSONB;
ALTER TABLE "BankTransaction" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);
ALTER TABLE "BankTransaction" ADD COLUMN IF NOT EXISTS "resolvedById" TEXT;
CREATE INDEX IF NOT EXISTS "BankTransaction_accountNo_bookedAt_idx" ON "BankTransaction"("accountNo", "bookedAt");

CREATE TABLE IF NOT EXISTS "BankAllocation" (
    "id" TEXT NOT NULL,
    "bankTxId" TEXT NOT NULL,
    "kind" "BankAllocKind" NOT NULL,
    "amount" INTEGER NOT NULL,
    "studentId" TEXT,
    "paymentId" TEXT,
    "note" TEXT,
    "auto" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    CONSTRAINT "BankAllocation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "BankAllocation_paymentId_key" ON "BankAllocation"("paymentId");
CREATE INDEX IF NOT EXISTS "BankAllocation_bankTxId_idx" ON "BankAllocation"("bankTxId");
CREATE INDEX IF NOT EXISTS "BankAllocation_studentId_idx" ON "BankAllocation"("studentId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BankAllocation_bankTxId_fkey') THEN
    ALTER TABLE "BankAllocation" ADD CONSTRAINT "BankAllocation_bankTxId_fkey"
      FOREIGN KEY ("bankTxId") REFERENCES "BankTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "BankPayerHint" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "lastAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankPayerHint_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "BankPayerHint_kind_value_studentId_key" ON "BankPayerHint"("kind", "value", "studentId");
CREATE INDEX IF NOT EXISTS "BankPayerHint_kind_value_idx" ON "BankPayerHint"("kind", "value");

CREATE TABLE IF NOT EXISTS "BankCursor" (
    "accountNo" TEXT NOT NULL,
    "settledThrough" TEXT NOT NULL,
    "coveredThrough" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BankCursor_pkey" PRIMARY KEY ("accountNo")
);
