-- CreateEnum
CREATE TYPE "AttemptSessionStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED');

-- CreateTable
CREATE TABLE "TestAttemptSession" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "seed" INTEGER NOT NULL,
    "problemOrder" JSONB NOT NULL,
    "choiceOrder" JSONB NOT NULL,
    "draftAnswers" JSONB NOT NULL DEFAULT '{}',
    "draftStates" JSONB NOT NULL DEFAULT '{}',
    "problemTimes" JSONB NOT NULL DEFAULT '{}',
    "leaveCount" INTEGER NOT NULL DEFAULT 0,
    "events" JSONB NOT NULL DEFAULT '[]',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadlineAt" TIMESTAMP(3),
    "status" "AttemptSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "submittedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestAttemptSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TestAttemptSession_studentId_status_idx" ON "TestAttemptSession"("studentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TestAttemptSession_testId_studentId_key" ON "TestAttemptSession"("testId", "studentId");

-- AddForeignKey
ALTER TABLE "TestAttemptSession" ADD CONSTRAINT "TestAttemptSession_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestAttemptSession" ADD CONSTRAINT "TestAttemptSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
