-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "studentNote" TEXT;

-- CreateTable
CREATE TABLE "SubmissionRevision" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "state" "SubmissionState" NOT NULL,
    "studentNote" TEXT,
    "reviewNote" TEXT,
    "legacyNote" TEXT,
    "imageKeys" TEXT[],
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubmissionRevision_submissionId_at_idx" ON "SubmissionRevision"("submissionId", "at");

-- AddForeignKey
ALTER TABLE "SubmissionRevision" ADD CONSTRAINT "SubmissionRevision_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

