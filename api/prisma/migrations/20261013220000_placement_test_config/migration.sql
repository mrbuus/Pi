-- AlterTable
ALTER TABLE "PlacementAttempt" ADD COLUMN     "testSnapshot" JSONB;

-- CreateTable
CREATE TABLE "PlacementTestConfig" (
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "instructions" TEXT,
    "problems" JSONB NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlacementTestConfig_pkey" PRIMARY KEY ("key")
);

