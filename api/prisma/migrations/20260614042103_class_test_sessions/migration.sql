-- CreateTable
CREATE TABLE "ClassTestSession" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassTestSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassTestSession_classroomId_date_idx" ON "ClassTestSession"("classroomId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ClassTestSession_classroomId_testId_date_key" ON "ClassTestSession"("classroomId", "testId", "date");
