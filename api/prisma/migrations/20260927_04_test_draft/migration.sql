-- Server-side autosave snapshots for test creation and a draft marker for duplicates.
ALTER TABLE "Test"
  ADD COLUMN "isDraft" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Test_isDraft_deletedAt_idx" ON "Test"("isDraft", "deletedAt");

CREATE TABLE "TestDraft" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "state" JSONB NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TestDraft_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TestDraft_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "TestDraft_ownerId_updatedAt_idx" ON "TestDraft"("ownerId", "updatedAt");
