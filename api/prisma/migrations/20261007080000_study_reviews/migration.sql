CREATE TYPE "StudyReviewStatus" AS ENUM ('OPEN','SUBMITTED','EXPIRED');
CREATE TABLE "StudyReviewRun" (
 "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "clientRequestId" TEXT NOT NULL,
 "normalizedRequestHash" TEXT NOT NULL, "budgetMinutes" INTEGER NOT NULL,
 "requestedChapterIds" TEXT[], "status" "StudyReviewStatus" NOT NULL DEFAULT 'OPEN',
 "startedAt" TIMESTAMP(3) NOT NULL, "deadlineAt" TIMESTAMP(3) NOT NULL,
 "submittedAt" TIMESTAMP(3), "selectionVersion" TEXT NOT NULL, "seed" INTEGER NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "StudyReviewRun_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "StudyReviewRun_budget_check" CHECK ("budgetMinutes" IN (10,30,60)),
 CONSTRAINT "StudyReviewRun_deadline_check" CHECK ("deadlineAt" > "startedAt")
);
CREATE TABLE "StudyReviewItem" (
 "id" TEXT NOT NULL, "runId" TEXT NOT NULL, "problemId" TEXT NOT NULL, "order" INTEGER NOT NULL,
 "sourceSnapshot" JSONB NOT NULL, "gradeSnapshot" JSONB NOT NULL, "gradingVersion" TEXT NOT NULL,
 "eligibilityAtStart" TEXT NOT NULL, "exposureBeforeFirst" BOOLEAN NOT NULL DEFAULT false,
 "firstRecordedAt" TIMESTAMP(3), "immutableFirstAnswer" JSONB,
 "immutableFirstFlags" TEXT[] DEFAULT ARRAY[]::TEXT[], "immutableFirstCorrect" BOOLEAN,
 CONSTRAINT "StudyReviewItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "StudyReviewResponse" (
 "id" TEXT NOT NULL, "itemId" TEXT NOT NULL, "userId" TEXT NOT NULL, "clientRequestId" TEXT NOT NULL,
 "requestHash" TEXT NOT NULL, "kind" TEXT NOT NULL, "answer" JSONB NOT NULL,
 "flags" TEXT[] DEFAULT ARRAY[]::TEXT[], "correct" BOOLEAN,
 "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "assistance" BOOLEAN NOT NULL DEFAULT false,
 CONSTRAINT "StudyReviewResponse_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "StudyReviewResponse_kind_check" CHECK ("kind" IN ('FIRST','CORRECTION'))
);
CREATE UNIQUE INDEX "StudyReviewRun_userId_clientRequestId_key" ON "StudyReviewRun"("userId","clientRequestId");
CREATE INDEX "StudyReviewRun_userId_startedAt_idx" ON "StudyReviewRun"("userId","startedAt");
CREATE UNIQUE INDEX "StudyReviewItem_runId_order_key" ON "StudyReviewItem"("runId","order");
CREATE UNIQUE INDEX "StudyReviewItem_runId_problemId_key" ON "StudyReviewItem"("runId","problemId");
CREATE INDEX "StudyReviewItem_problemId_idx" ON "StudyReviewItem"("problemId");
CREATE UNIQUE INDEX "StudyReviewResponse_itemId_userId_clientRequestId_key" ON "StudyReviewResponse"("itemId","userId","clientRequestId");
CREATE INDEX "StudyReviewResponse_userId_occurredAt_idx" ON "StudyReviewResponse"("userId","occurredAt");
ALTER TABLE "StudyReviewRun" ADD CONSTRAINT "StudyReviewRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudyReviewItem" ADD CONSTRAINT "StudyReviewItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "StudyReviewRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudyReviewItem" ADD CONSTRAINT "StudyReviewItem_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudyReviewResponse" ADD CONSTRAINT "StudyReviewResponse_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "StudyReviewItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudyReviewResponse" ADD CONSTRAINT "StudyReviewResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
