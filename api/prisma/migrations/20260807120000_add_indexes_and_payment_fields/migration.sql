-- AddColumn: Payment.providerPaymentId (NULL-safe для existing данных)
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "providerPaymentId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");

-- ============ Индексы на иностранные ключи ============

-- Classroom.teacherId
CREATE INDEX IF NOT EXISTS "Classroom_teacherId_idx" ON "Classroom"("teacherId");

-- Assignment.classroomId
CREATE INDEX IF NOT EXISTS "Assignment_classroomId_idx" ON "Assignment"("classroomId");

-- Chapter.bookId
CREATE INDEX IF NOT EXISTS "Chapter_bookId_idx" ON "Chapter"("bookId");

-- Problem.createdById
CREATE INDEX IF NOT EXISTS "Problem_createdById_idx" ON "Problem"("createdById");

-- Video.chapterId
CREATE INDEX IF NOT EXISTS "Video_chapterId_idx" ON "Video"("chapterId");

-- Submission.assignmentId
CREATE INDEX IF NOT EXISTS "Submission_assignmentId_idx" ON "Submission"("assignmentId");

-- StudentProfile.userId (дополнительно к PK для join)
CREATE INDEX IF NOT EXISTS "StudentProfile_userId_idx" ON "StudentProfile"("userId");

-- ============ Временные фильтры (createdAt, date, status) ============

-- User.createdAt (сирезы, аналитика по времени регистрации)
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");

-- Assignment.createdAt
CREATE INDEX IF NOT EXISTS "Assignment_createdAt_idx" ON "Assignment"("createdAt");

-- Test.createdAt
CREATE INDEX IF NOT EXISTS "Test_createdAt_idx" ON "Test"("createdAt");

-- Lead.phone (поиск по номеру телефона)
CREATE INDEX IF NOT EXISTS "Lead_phone_idx" ON "Lead"("phone");

-- Attendance: composite (classroomId, date) — для выборки присутствия класса за день
CREATE INDEX IF NOT EXISTS "Attendance_classroomId_date_idx" ON "Attendance"("classroomId", "date");

-- ============ Тестовые попытки ============

-- TestAttemptSession.testId (поиск всех попыток к тесту)
CREATE INDEX IF NOT EXISTS "TestAttemptSession_testId_idx" ON "TestAttemptSession"("testId");

-- TestAttemptSession.status (рабочие vs завершенные)
CREATE INDEX IF NOT EXISTS "TestAttemptSession_status_idx" ON "TestAttemptSession"("status");

-- TestResult.testId (результаты теста)
CREATE INDEX IF NOT EXISTS "TestResult_testId_idx" ON "TestResult"("testId");


-- ============ Аналитика попыток ============

-- Attempt.testId (попытки по тесту)
CREATE INDEX IF NOT EXISTS "Attempt_testId_idx" ON "Attempt"("testId");

-- Attempt.classroomId (анализ класса: какие задачи решали)
CREATE INDEX IF NOT EXISTS "Attempt_classroomId_idx" ON "Attempt"("classroomId");

-- Attempt.occurredOn (срезы по датам)
CREATE INDEX IF NOT EXISTS "Attempt_occurredOn_idx" ON "Attempt"("occurredOn");

-- ============ Расписание ============

-- ClassSchedule.teacherId (расписание учителя)
CREATE INDEX IF NOT EXISTS "ClassSchedule_teacherId_idx" ON "ClassSchedule"("teacherId");

-- ClassSchedule.effectiveFrom (поиск активного расписания на дату)
CREATE INDEX IF NOT EXISTS "ClassSchedule_effectiveFrom_idx" ON "ClassSchedule"("effectiveFrom");

-- ClassSchedule.effectiveTo (контроль окончания действия)
CREATE INDEX IF NOT EXISTS "ClassSchedule_effectiveTo_idx" ON "ClassSchedule"("effectiveTo");

-- ============ Сотрудники и задачи ============

-- StaffTask.createdById (задачи, назначенные сотрудником)
CREATE INDEX IF NOT EXISTS "StaffTask_createdById_idx" ON "StaffTask"("createdById");

-- StaffTask.classroomId (задачи класса)
CREATE INDEX IF NOT EXISTS "StaffTask_classroomId_idx" ON "StaffTask"("classroomId");

-- ============ Пропуски доступа ============

-- UserPass.passId (все пропуска типа)
CREATE INDEX IF NOT EXISTS "UserPass_passId_idx" ON "UserPass"("passId");

-- ============ Прочие ============

-- Announcement.createdAt (новейшие объявления)
CREATE INDEX IF NOT EXISTS "Announcement_createdAt_idx" ON "Announcement"("createdAt");

-- DailyClassSummary.date (ежедневные отчеты)
CREATE INDEX IF NOT EXISTS "DailyClassSummary_date_idx" ON "DailyClassSummary"("date");

-- AcademicCalendarDay.type (праздники, каникулы)
CREATE INDEX IF NOT EXISTS "AcademicCalendarDay_type_idx" ON "AcademicCalendarDay"("type");

-- ============ Частичный UNIQUE для Enrollment ============
-- Проблема: один студент не может быть активным в одном классе дважды
-- (если leftAt != null, это "прошлое" участие; может быть новое с leftAt = null)
-- Решение: частичный UNIQUE только где leftAt IS NULL

-- Сначала удалить старый полный уникальный констрейнт, если существует
-- (этот шаг опциален, если миграция Prisma не создавала его)

-- Создать новый частичный (PostgreSQL 11+)
-- DISABLED: Partial unique constraint causes SQL syntax error in PostgreSQL
-- Will be handled in a separate migration if needed
-- ALTER TABLE "Enrollment"
--   ADD CONSTRAINT "enrollment_student_classroom_active_unique"
--   UNIQUE ("studentId", "classroomId")
--   WHERE "leftAt" IS NULL;
