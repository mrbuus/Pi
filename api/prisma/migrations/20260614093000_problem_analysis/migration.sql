-- Store detailed per-problem mathematical analysis separately from the source problem text.
CREATE TYPE "ProblemAnalysisStatus" AS ENUM ('AUTO_DRAFT', 'REVIEW_REQUIRED', 'VERIFIED');
CREATE TYPE "AnswerKeyStatus" AS ENUM ('VERIFIED', 'MISSING', 'REVIEW_REQUIRED');

CREATE TABLE "ProblemAnalysis" (
  "problemId" TEXT NOT NULL,
  "status" "ProblemAnalysisStatus" NOT NULL DEFAULT 'AUTO_DRAFT',
  "answerKeyStatus" "AnswerKeyStatus" NOT NULL DEFAULT 'VERIFIED',
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "sourcePath" TEXT,
  "sourceVariant" TEXT,
  "topic" TEXT NOT NULL,
  "subtopic" TEXT,
  "skills" TEXT[],
  "methods" TEXT[],
  "formulas" JSONB NOT NULL,
  "domainNotes" TEXT[],
  "signRules" TEXT[],
  "commonMistakes" TEXT[],
  "solutionOutline" TEXT,
  "auditNotes" TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProblemAnalysis_pkey" PRIMARY KEY ("problemId")
);

CREATE INDEX "ProblemAnalysis_status_idx" ON "ProblemAnalysis"("status");
CREATE INDEX "ProblemAnalysis_answerKeyStatus_idx" ON "ProblemAnalysis"("answerKeyStatus");
CREATE INDEX "ProblemAnalysis_topic_idx" ON "ProblemAnalysis"("topic");

ALTER TABLE "ProblemAnalysis"
  ADD CONSTRAINT "ProblemAnalysis_problemId_fkey"
  FOREIGN KEY ("problemId") REFERENCES "Problem"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
