ALTER TABLE "Video" ADD COLUMN "problemId" TEXT, ADD COLUMN "createdById" TEXT;
ALTER TABLE "Video" ADD CONSTRAINT "Video_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Video_problemId_deletedAt_idx" ON "Video"("problemId", "deletedAt");
