-- AlterTable
ALTER TABLE "ClassTestSession" ADD COLUMN     "manualProblemCount" INTEGER,
ADD COLUMN     "manualTitle" TEXT,
ALTER COLUMN "testId" DROP NOT NULL;

