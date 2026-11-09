-- Зөөлөн устгал (2-р үе): хуваарийн онцгой тохиолдол (ScheduleException), хичээлийн
-- сэдэв/төлөвлөгөө (LessonTopic), хичээлийн багшийн оноолт (LessonStaffing), хуанлийн
-- өдрийн ангийн холбоос (AcademicCalendarDayClassroom), даалгаврын хариуцагч
-- (StaffTaskAssignee), ангийн тестийн төлөв (ClassTestStatus), тестийн ноорог (TestDraft),
-- оролдлого (Attempt), суралцахуйн үйл явдал (LearningEvent).
-- Эзний хатуу дүрэм (2026-10-23): прод өгөгдлийг ХЭЗЭЭ Ч устгахгүй — «устгах» = deletedAt.
-- Зөвхөн НЭМЭХ (баганууд nullable, анхдагч утгагүй — PostgreSQL-д зөвхөн метадата,
-- хүснэгтийг дахин бичихгүй). Одоо байгаа мөр, өгөгдөлд хүрэхгүй.
-- Дахин ажиллуулахад унахгүй (IF NOT EXISTS).
--
-- UNIQUE / PK-г ӨӨРЧЛӨХГҮЙ: (scheduleId, date), (classroomId, testId), (taskId, userId),
-- (calendarDayId, classroomId) түлхүүрүүд дээр код `upsert` / `scheduleId_date` хайлт хийдэг
-- (ON CONFLICT нь хэсэгчилсэн индекстэй ажиллахгүй, PK-г хэсэгчилж болохгүй). Тиймээс ижил
-- түлхүүрээр дахин үүсгэх нь устсан мөрийг СЭРГЭЭНЭ (deletedAt = NULL); устгах үеийн бүтэн
-- өмнөх төлөв AuditLog-д үлдэнэ.
--
-- Attempt, LearningEvent: том хүснэгт — deletedAt индекс нэмэхгүй (бараг бүх мөр NULL тул
-- "deletedAt" IS NULL шүүлтүүрт индекс тусгүй, миграцийн үед хүснэгт түгжихээс сэргийлнэ).

ALTER TABLE "ScheduleException" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "ScheduleException" ADD COLUMN IF NOT EXISTS "deletedById" TEXT;
CREATE INDEX IF NOT EXISTS "ScheduleException_deletedAt_idx" ON "ScheduleException"("deletedAt");

ALTER TABLE "LessonTopic" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "LessonTopic" ADD COLUMN IF NOT EXISTS "deletedById" TEXT;
CREATE INDEX IF NOT EXISTS "LessonTopic_deletedAt_idx" ON "LessonTopic"("deletedAt");

ALTER TABLE "LessonStaffing" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "LessonStaffing" ADD COLUMN IF NOT EXISTS "deletedById" TEXT;
CREATE INDEX IF NOT EXISTS "LessonStaffing_deletedAt_idx" ON "LessonStaffing"("deletedAt");

ALTER TABLE "AcademicCalendarDayClassroom" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "AcademicCalendarDayClassroom" ADD COLUMN IF NOT EXISTS "deletedById" TEXT;
CREATE INDEX IF NOT EXISTS "AcademicCalendarDayClassroom_deletedAt_idx" ON "AcademicCalendarDayClassroom"("deletedAt");

ALTER TABLE "StaffTaskAssignee" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "StaffTaskAssignee" ADD COLUMN IF NOT EXISTS "deletedById" TEXT;
CREATE INDEX IF NOT EXISTS "StaffTaskAssignee_deletedAt_idx" ON "StaffTaskAssignee"("deletedAt");

ALTER TABLE "ClassTestStatus" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "ClassTestStatus" ADD COLUMN IF NOT EXISTS "deletedById" TEXT;
CREATE INDEX IF NOT EXISTS "ClassTestStatus_deletedAt_idx" ON "ClassTestStatus"("deletedAt");

ALTER TABLE "TestDraft" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "TestDraft" ADD COLUMN IF NOT EXISTS "deletedById" TEXT;
CREATE INDEX IF NOT EXISTS "TestDraft_deletedAt_idx" ON "TestDraft"("deletedAt");

ALTER TABLE "Attempt" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Attempt" ADD COLUMN IF NOT EXISTS "deletedById" TEXT;

ALTER TABLE "LearningEvent" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "LearningEvent" ADD COLUMN IF NOT EXISTS "deletedById" TEXT;
