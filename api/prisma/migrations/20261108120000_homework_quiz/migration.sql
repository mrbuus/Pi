-- Гэрийн даалгаврыг ангид богино шалгалтаар шалгах (эзэн 2026-11-08). Зөвхөн НЭМЭЛТ хүснэгт —
-- одоо байгаа өгөгдөлд хүрэхгүй.
CREATE TABLE IF NOT EXISTS "HomeworkQuiz" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "problemCount" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "HomeworkQuiz_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HomeworkQuiz_classroomId_date_key" ON "HomeworkQuiz"("classroomId", "date");

CREATE TABLE IF NOT EXISTS "HomeworkQuizScore" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "HomeworkQuizScore_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HomeworkQuizScore_quizId_studentId_key" ON "HomeworkQuizScore"("quizId", "studentId");
CREATE INDEX IF NOT EXISTS "HomeworkQuizScore_studentId_idx" ON "HomeworkQuizScore"("studentId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'HomeworkQuizScore_quizId_fkey') THEN
    ALTER TABLE "HomeworkQuizScore" ADD CONSTRAINT "HomeworkQuizScore_quizId_fkey"
      FOREIGN KEY ("quizId") REFERENCES "HomeworkQuiz"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
