-- Гэрийн даалгаврыг өгсөн хичээлээр (анги + огноо) холбох (эзэн 2026-10-27).
-- Сурагч ном/бүлэг/сэдэв сонгохгүй; шошгыг тухайн өдрийн төлөвлөгөөнөөс угсарна.
-- Хуучин мөр null үлдэнэ (createdAt-ийн УБ өдрөөр тооцно). Зөвхөн НЭМЭХ.

ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS "lessonDate" DATE;
CREATE INDEX IF NOT EXISTS "Assignment_classroomId_lessonDate_idx" ON "Assignment"("classroomId", "lessonDate");
