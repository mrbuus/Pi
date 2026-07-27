-- CreateEnum
CREATE TYPE "Subject" AS ENUM ('MATH', 'SOCIAL_STUDIES');

-- CreateEnum
CREATE TYPE "LearningEventType" AS ENUM ('LOGIN', 'LOGOUT', 'SEARCH', 'CHAPTER_OPENED', 'VIDEO_STARTED', 'VIDEO_COMPLETED', 'PROBLEM_OPENED', 'ANSWER_SUBMITTED', 'HINT_USED', 'RETRY', 'BOOKMARK', 'TEST_STARTED', 'TEST_FINISHED', 'EVENING_MARK', 'PAGE_VIEW');

-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "subject" "Subject" NOT NULL DEFAULT 'MATH';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "teacherCode" TEXT;

-- CreateTable
CREATE TABLE "LearningEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "LearningEventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT,
    "problemId" TEXT,
    "testId" TEXT,
    "chapterId" TEXT,
    "videoId" TEXT,
    "durationMs" INTEGER,
    "device" TEXT,
    "meta" JSONB,

    CONSTRAINT "LearningEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearningEvent_userId_idx" ON "LearningEvent"("userId");

-- CreateIndex
CREATE INDEX "LearningEvent_occurredAt_idx" ON "LearningEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "LearningEvent_sessionId_idx" ON "LearningEvent"("sessionId");

-- CreateIndex
CREATE INDEX "LearningEvent_userId_occurredAt_idx" ON "LearningEvent"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "Book_subject_idx" ON "Book"("subject");

-- CreateIndex
CREATE UNIQUE INDEX "User_teacherCode_key" ON "User"("teacherCode");

-- AddForeignKey
ALTER TABLE "LearningEvent" ADD CONSTRAINT "LearningEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

