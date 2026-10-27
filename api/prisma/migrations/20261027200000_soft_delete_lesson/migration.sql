-- «Батламж цуцлах», «тайлбар хоосолох» ЗӨӨЛӨН (эзэн 2026-10-23: прод өгөгдөл
-- хэзээ ч устгахгүй). LessonRecord: cancelledAt-тэй мөр уншилтаас хасагдана,
-- дахин батлахад сэргээнэ. LessonRecordStudent: дахин батлахад snapshot-оос
-- гарсан сурагч removedAt-тэй үлдэнэ. LessonNote: хоосолбол deletedAt (body хэвээр).
-- Зөвхөн НЭМЭХ.

ALTER TABLE "LessonRecord" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE "LessonRecord" ADD COLUMN IF NOT EXISTS "cancelledById" TEXT;
ALTER TABLE "LessonRecordStudent" ADD COLUMN IF NOT EXISTS "removedAt" TIMESTAMP(3);
ALTER TABLE "LessonNote" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "LessonNote" ADD COLUMN IF NOT EXISTS "deletedById" TEXT;
