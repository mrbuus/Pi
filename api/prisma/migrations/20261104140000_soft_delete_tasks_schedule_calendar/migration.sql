-- Зөөлөн устгал: ажилтны даалгавар (StaffTask), хичээлийн хуваарь (ClassSchedule),
-- сургалтын хуанли (AcademicCalendarDay).
-- Эзний хатуу дүрэм (2026-10-23): прод өгөгдлийг ХЭЗЭЭ Ч устгахгүй — «устгах» = deletedAt.
-- Зөвхөн НЭМЭХ (баганууд nullable) — одоо байгаа мөр, өгөгдөлд хүрэхгүй.
-- Дахин ажиллуулахад унахгүй (IF NOT EXISTS / IF EXISTS).

ALTER TABLE "StaffTask" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "StaffTask" ADD COLUMN IF NOT EXISTS "deletedById" TEXT;
CREATE INDEX IF NOT EXISTS "StaffTask_deletedAt_idx" ON "StaffTask"("deletedAt");

ALTER TABLE "ClassSchedule" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "ClassSchedule" ADD COLUMN IF NOT EXISTS "deletedById" TEXT;
CREATE INDEX IF NOT EXISTS "ClassSchedule_deletedAt_idx" ON "ClassSchedule"("deletedAt");

ALTER TABLE "AcademicCalendarDay" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "AcademicCalendarDay" ADD COLUMN IF NOT EXISTS "deletedById" TEXT;
CREATE INDEX IF NOT EXISTS "AcademicCalendarDay_deletedAt_idx" ON "AcademicCalendarDay"("deletedAt");

-- ClassSchedule (classroomId, weekday, startMinute, effectiveFrom) UNIQUE-ийг зөвхөн
-- идэвхтэй (deletedAt IS NULL) мөрүүдэд хамааруулна. Эс бөгөөс устгасан хичээлийг
-- ижил анги/гараг/цаг/эхлэх огноогоор дахин нэмэх (эсвэл «Ангийн 7 хоног»-оор
-- хараахан эхлээгүй өдрийг хасаад дахин нэмэх) үед P2002 өгнө.
-- Одоо байгаа бүх мөр deletedAt = NULL бөгөөд аль хэдийн давтагдашгүй тул шинэ
-- индекс алдаагүй үүснэ. Өгөгдөл өөрчлөгдөхгүй — устсан мөрийг тооцохоо л больж,
-- идэвхтэй мөрүүдийн баталгаа хэвээр үлдэнэ.
-- Prisma схемд: @@unique([...], where: { deletedAt: null }) (previewFeatures partialIndexes).
DROP INDEX IF EXISTS "ClassSchedule_classroomId_weekday_startMinute_effectiveFrom_key";
CREATE UNIQUE INDEX IF NOT EXISTS "ClassSchedule_classroomId_weekday_startMinute_effectiveFrom_key"
  ON "ClassSchedule"("classroomId", "weekday", "startMinute", "effectiveFrom")
  WHERE ("deletedAt" IS NULL);
