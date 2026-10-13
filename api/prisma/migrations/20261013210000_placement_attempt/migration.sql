-- CreateEnum
CREATE TYPE "PlacementStatus" AS ENUM ('NEW', 'REVIEWED', 'CONTACTED');

-- CreateTable
CREATE TABLE "PlacementAttempt" (
    "id" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "testKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "school" TEXT,
    "parentPhone" TEXT,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "photos" JSONB NOT NULL DEFAULT '{}',
    "photoKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "autoScore" INTEGER,
    "maxScore" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "autoSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "status" "PlacementStatus" NOT NULL DEFAULT 'NEW',
    "level" TEXT,
    "teacherNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlacementAttempt_status_createdAt_idx" ON "PlacementAttempt"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PlacementAttempt_phone_idx" ON "PlacementAttempt"("phone");

