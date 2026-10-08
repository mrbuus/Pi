ALTER TABLE "TheoryBlock" ADD COLUMN "archivedAt" TIMESTAMP(3);
CREATE INDEX "TheoryBlock_chapterId_archivedAt_idx" ON "TheoryBlock"("chapterId", "archivedAt");
