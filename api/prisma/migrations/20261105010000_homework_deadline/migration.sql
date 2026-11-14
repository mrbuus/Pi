-- Гэрийн даалгаврын хугацааг багш гараар тохируулах. Зөвхөн нэмэлт хүснэгт.
CREATE TABLE "HomeworkDeadline" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "lessonDate" DATE NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "allowLate" BOOLEAN NOT NULL DEFAULT true,
    "setById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeworkDeadline_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HomeworkDeadline_classroomId_lessonDate_key" ON "HomeworkDeadline"("classroomId", "lessonDate");
