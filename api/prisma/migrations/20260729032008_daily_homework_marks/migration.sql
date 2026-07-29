-- CreateEnum
CREATE TYPE "HomeworkMarkStatus" AS ENUM ('DONE', 'PARTIAL', 'NOT_DONE');

-- CreateTable
CREATE TABLE "DailyHomeworkMark" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "HomeworkMarkStatus",
    "comment" TEXT,
    "markedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyHomeworkMark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyHomeworkMark_classroomId_date_idx" ON "DailyHomeworkMark"("classroomId", "date");

-- CreateIndex
CREATE INDEX "DailyHomeworkMark_studentId_date_idx" ON "DailyHomeworkMark"("studentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyHomeworkMark_classroomId_studentId_date_key" ON "DailyHomeworkMark"("classroomId", "studentId", "date");

-- AddForeignKey
ALTER TABLE "DailyHomeworkMark" ADD CONSTRAINT "DailyHomeworkMark_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyHomeworkMark" ADD CONSTRAINT "DailyHomeworkMark_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
