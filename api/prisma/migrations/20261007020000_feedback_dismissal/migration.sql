-- AlterTable
ALTER TABLE "StoredFile" ADD COLUMN     "ownerId" TEXT;

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "clientRequestId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "contextPath" TEXT,
    "attachmentKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "state" TEXT NOT NULL DEFAULT 'OPEN',
    "response" TEXT,
    "respondedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassDismissal" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "approximateAt" TIMESTAMP(3) NOT NULL,
    "lastLeftAt" TIMESTAMP(3),
    "issuedById" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassDismissal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Feedback_state_createdAt_idx" ON "Feedback"("state", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_authorId_clientRequestId_key" ON "Feedback"("authorId", "clientRequestId");

-- CreateIndex
CREATE INDEX "ClassDismissal_date_idx" ON "ClassDismissal"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ClassDismissal_classroomId_date_key" ON "ClassDismissal"("classroomId", "date");

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassDismissal" ADD CONSTRAINT "ClassDismissal_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

