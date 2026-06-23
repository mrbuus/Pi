-- AlterTable
ALTER TABLE "ClassTestSession" ADD COLUMN     "excludedProblemIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
