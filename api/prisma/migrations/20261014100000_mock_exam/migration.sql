-- CreateTable
CREATE TABLE "MockExamEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MockExamEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockExamRegistration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockExamRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MockExamEvent_startsAt_idx" ON "MockExamEvent"("startsAt");

-- CreateIndex
CREATE INDEX "MockExamEvent_testId_idx" ON "MockExamEvent"("testId");

-- CreateIndex
CREATE INDEX "MockExamRegistration_userId_idx" ON "MockExamRegistration"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MockExamRegistration_eventId_userId_key" ON "MockExamRegistration"("eventId", "userId");

-- AddForeignKey
ALTER TABLE "MockExamEvent" ADD CONSTRAINT "MockExamEvent_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockExamRegistration" ADD CONSTRAINT "MockExamRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "MockExamEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockExamRegistration" ADD CONSTRAINT "MockExamRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

