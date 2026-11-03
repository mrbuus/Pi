-- Дахин бодох (эзэн 2026-11-03): оролдлого бүрийн дугаар. Одоо байгаа мөр бүр round = 1 (өгөгдөл өөрчлөгдөхгүй).
ALTER TABLE "HomeworkAttempt" ADD COLUMN "round" INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX "HomeworkAttempt_studentId_testId_lessonDate_round_key"
  ON "HomeworkAttempt"("studentId", "testId", "lessonDate", "round");

DROP INDEX IF EXISTS "HomeworkAttempt_studentId_testId_lessonDate_key";
