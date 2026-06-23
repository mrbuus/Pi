-- CreateEnum
CREATE TYPE "MistakeType" AS ENUM ('NONE', 'SIGN_ERROR', 'INCOMPLETE_STEP', 'CALC_ERROR_NEAR', 'CONCEPT_GAP', 'UNRELATED_GUESS', 'OTHER');

-- AlterEnum
ALTER TYPE "TagType" ADD VALUE 'SOLUTION_TYPE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "studentCode" TEXT,
ADD COLUMN     "username" TEXT,
ALTER COLUMN "phone" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ProblemChoice" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "mistakeType" "MistakeType" NOT NULL DEFAULT 'NONE',
    "mistakeNote" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "ProblemChoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProblemChoice_problemId_idx" ON "ProblemChoice"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "ProblemChoice_problemId_label_key" ON "ProblemChoice"("problemId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_studentCode_key" ON "User"("studentCode");

-- AddForeignKey
ALTER TABLE "ProblemChoice" ADD CONSTRAINT "ProblemChoice_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

