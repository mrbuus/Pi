ALTER TABLE "Attempt"
  ADD COLUMN IF NOT EXISTS "mistakeCollectedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "Attempt_mistakeCollectedAt_autoCorrect_idx"
  ON "Attempt"("mistakeCollectedAt", "autoCorrect");

CREATE TABLE IF NOT EXISTS "MistakeEntry" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "problemId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "sourceRefId" TEXT,
  "sourceOccurredAt" TIMESTAMP(3),
  "testTitle" TEXT,
  "givenAnswer" JSONB,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "consecutiveCorrect" INTEGER NOT NULL DEFAULT 0,
  "lastRetryAt" TIMESTAMP(3),
  "lastCorrectAt" TIMESTAMP(3),
  "nextRetryAt" TIMESTAMP(3),
  "reason" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MistakeEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MistakeEntry_userId_problemId_key"
  ON "MistakeEntry"("userId", "problemId");
CREATE INDEX IF NOT EXISTS "MistakeEntry_userId_status_nextRetryAt_idx"
  ON "MistakeEntry"("userId", "status", "nextRetryAt");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MistakeEntry_userId_fkey') THEN
    ALTER TABLE "MistakeEntry" ADD CONSTRAINT "MistakeEntry_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MistakeEntry_problemId_fkey') THEN
    ALTER TABLE "MistakeEntry" ADD CONSTRAINT "MistakeEntry_problemId_fkey"
      FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
