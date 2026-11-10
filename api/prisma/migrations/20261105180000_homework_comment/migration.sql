-- Гэрийн даалгавар: сурагчийн тайлбар, багшийн «Буцаах», сурагчид харагдах сэтгэгдэл (2026-11-05)
-- Зөвхөн НЭМЭХ өөрчлөлт — одоо байгаа өгөгдөлд хүрэхгүй.
ALTER TABLE "HomeworkPhoto" ADD COLUMN "caption" TEXT;
ALTER TABLE "HomeworkPhoto" ADD COLUMN "returnedAt" TIMESTAMP(3);
ALTER TABLE "HomeworkPhoto" ADD COLUMN "returnedById" TEXT;

CREATE TABLE "HomeworkComment" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "lessonDate" DATE NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorRole" "Role" NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'NOTE',
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "HomeworkComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HomeworkComment_studentId_classroomId_lessonDate_idx" ON "HomeworkComment"("studentId", "classroomId", "lessonDate");
CREATE INDEX "HomeworkComment_classroomId_lessonDate_idx" ON "HomeworkComment"("classroomId", "lessonDate");
