-- Add missing fields to TuitionRefund
ALTER TABLE "TuitionRefund"
ADD COLUMN IF NOT EXISTS "shortfall" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "warnings" TEXT,
ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT,
ADD COLUMN IF NOT EXISTS "paidById" TEXT,
ADD COLUMN IF NOT EXISTS "cancelledById" TEXT,
ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "cancelReason" TEXT,
ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Гадаад түлхүүр — ДАХИН АЖИЛЛУУЛАХАД АЮУЛГҮЙ.
-- PostgreSQL нь `ADD CONSTRAINT IF NOT EXISTS` -ыг ДЭМЖДЭГГҮЙ тул нөхцөлийг
-- гараар шалгана. Deploy дунд тасарч дахин оролдвол «constraint already
-- exists» гэж унахгүй.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TuitionRefund_paidById_fkey'
  ) THEN
    ALTER TABLE "TuitionRefund"
      ADD CONSTRAINT "TuitionRefund_paidById_fkey"
      FOREIGN KEY ("paidById") REFERENCES "User" ("id") ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TuitionRefund_cancelledById_fkey'
  ) THEN
    ALTER TABLE "TuitionRefund"
      ADD CONSTRAINT "TuitionRefund_cancelledById_fkey"
      FOREIGN KEY ("cancelledById") REFERENCES "User" ("id") ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "TuitionRefund_createdAt_idx" ON "TuitionRefund"("createdAt");
