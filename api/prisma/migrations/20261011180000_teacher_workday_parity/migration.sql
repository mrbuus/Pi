-- Багшийн ажлын өдөр: СОНДГОЙ/ТЭГШ 7 хоногийн ээлж + хүснэгтийн дараалал.
-- Нэмэлт (additive) — байгаа мөрүүд parity=0 (7 хоног бүр) болно.
ALTER TABLE "TeacherWorkDay" ADD COLUMN IF NOT EXISTS "parity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TeacherWorkDay" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

DROP INDEX IF EXISTS "TeacherWorkDay_teacherId_weekday_key";
CREATE UNIQUE INDEX IF NOT EXISTS "TeacherWorkDay_teacherId_weekday_parity_key"
  ON "TeacherWorkDay"("teacherId", "weekday", "parity");
