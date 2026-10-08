-- CreateTable
CREATE TABLE "LessonPacket" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "chapterId" TEXT NOT NULL,
    "theoryBlockIds" TEXT[],
    "testSessionId" TEXT,
    "homeworkAssignmentId" TEXT,
    "makeupTestId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonPacket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonReceipt" (
    "id" TEXT NOT NULL,
    "packetId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "imageKeys" TEXT[],
    "clientRequestId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonPhotoTurn" (
    "id" TEXT NOT NULL,
    "packetId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "assignedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonPhotoTurn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonRotation" (
    "classroomId" TEXT NOT NULL,
    "cursorStudentId" TEXT,
    "pendingStudentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "servedStudentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cycle" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonRotation_pkey" PRIMARY KEY ("classroomId")
);

-- CreateIndex
CREATE UNIQUE INDEX "LessonPacket_classroomId_date_key" ON "LessonPacket"("classroomId", "date");

-- CreateIndex
CREATE INDEX "LessonReceipt_packetId_kind_submittedAt_idx" ON "LessonReceipt"("packetId", "kind", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LessonReceipt_packetId_studentId_kind_clientRequestId_key" ON "LessonReceipt"("packetId", "studentId", "kind", "clientRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonPhotoTurn_packetId_key" ON "LessonPhotoTurn"("packetId");

-- AddForeignKey
ALTER TABLE "LessonPacket" ADD CONSTRAINT "LessonPacket_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPacket" ADD CONSTRAINT "LessonPacket_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonReceipt" ADD CONSTRAINT "LessonReceipt_packetId_fkey" FOREIGN KEY ("packetId") REFERENCES "LessonPacket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPhotoTurn" ADD CONSTRAINT "LessonPhotoTurn_packetId_fkey" FOREIGN KEY ("packetId") REFERENCES "LessonPacket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonRotation" ADD CONSTRAINT "LessonRotation_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

