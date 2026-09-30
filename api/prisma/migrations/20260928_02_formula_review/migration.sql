CREATE TABLE "FormulaReview" (
  "userId" TEXT NOT NULL, "formulaId" TEXT NOT NULL,
  "box" INTEGER NOT NULL DEFAULT 0 CHECK ("box" BETWEEN 0 AND 5),
  "dueAt" TIMESTAMP(3) NOT NULL, "lastResult" TEXT,
  "streak" INTEGER NOT NULL DEFAULT 0, "reviewCount" INTEGER NOT NULL DEFAULT 0,
  "lapses" INTEGER NOT NULL DEFAULT 0, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FormulaReview_pkey" PRIMARY KEY ("userId", "formulaId")
);
CREATE INDEX "FormulaReview_userId_dueAt_idx" ON "FormulaReview"("userId", "dueAt");
ALTER TABLE "FormulaReview" ADD CONSTRAINT "FormulaReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FormulaReview" ADD CONSTRAINT "FormulaReview_formulaId_fkey" FOREIGN KEY ("formulaId") REFERENCES "Formula"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "FormulaReviewDay" (
  "userId" TEXT NOT NULL, "day" DATE NOT NULL, "count" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "FormulaReviewDay_pkey" PRIMARY KEY ("userId", "day")
);
ALTER TABLE "FormulaReviewDay" ADD CONSTRAINT "FormulaReviewDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "FormulaReviewAttempt" (
  "userId" TEXT NOT NULL, "exerciseId" TEXT NOT NULL, "formulaId" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL, "response" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
  CONSTRAINT "FormulaReviewAttempt_pkey" PRIMARY KEY ("userId", "exerciseId")
);
CREATE INDEX "FormulaReviewAttempt_formulaId_idx" ON "FormulaReviewAttempt"("formulaId");
ALTER TABLE "FormulaReviewAttempt" ADD CONSTRAINT "FormulaReviewAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FormulaReviewAttempt" ADD CONSTRAINT "FormulaReviewAttempt_formulaId_fkey" FOREIGN KEY ("formulaId") REFERENCES "Formula"("id") ON DELETE CASCADE ON UPDATE CASCADE;
