ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "archivedById" TEXT,
  ADD COLUMN IF NOT EXISTS "archiveReason" TEXT;

CREATE INDEX IF NOT EXISTS "User_archivedAt_idx" ON "User"("archivedAt");
