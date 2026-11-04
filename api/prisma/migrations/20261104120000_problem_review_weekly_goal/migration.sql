-- Алдсан бодлогын хугацаатай давталт ба 7 хоногийн зорилго (шинэ хүснэгт, одоо байгаа өгөгдөлд хүрэхгүй)
CREATE TABLE IF NOT EXISTS "ProblemReview" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "intervalDays" INTEGER NOT NULL DEFAULT 1,
    "ease" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "reps" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "lastResult" TEXT,
    "source" TEXT NOT NULL,
    "lastEventAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProblemReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProblemReview_studentId_problemId_key" ON "ProblemReview"("studentId", "problemId");
CREATE INDEX IF NOT EXISTS "ProblemReview_studentId_dueAt_idx" ON "ProblemReview"("studentId", "dueAt");

CREATE TABLE IF NOT EXISTS "StudyWeeklyGoal" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "daysPerWeek" INTEGER NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyWeeklyGoal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudyWeeklyGoal_studentId_key" ON "StudyWeeklyGoal"("studentId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProblemReview_studentId_fkey') THEN
    ALTER TABLE "ProblemReview" ADD CONSTRAINT "ProblemReview_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProblemReview_problemId_fkey') THEN
    ALTER TABLE "ProblemReview" ADD CONSTRAINT "ProblemReview_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudyWeeklyGoal_studentId_fkey') THEN
    ALTER TABLE "StudyWeeklyGoal" ADD CONSTRAINT "StudyWeeklyGoal_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
