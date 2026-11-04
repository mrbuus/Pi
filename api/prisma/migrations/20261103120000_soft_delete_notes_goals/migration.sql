-- Зөөлөн устгал: багшийн сурагчийн тэмдэглэл (StudentNote), сурагчийн зорилго (StudentGoal).
-- Эзний хатуу дүрэм (2026-10-23): прод өгөгдлийг ХЭЗЭЭ Ч устгахгүй — «устгах» = deletedAt.
-- Зөвхөн НЭМЭХ (баганууд nullable) — одоо байгаа мөр, өгөгдөлд хүрэхгүй.
-- Дахин ажиллуулахад унахгүй (IF NOT EXISTS).

ALTER TABLE "StudentNote" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "StudentNote" ADD COLUMN IF NOT EXISTS "deletedById" TEXT;
CREATE INDEX IF NOT EXISTS "StudentNote_deletedAt_idx" ON "StudentNote"("deletedAt");

ALTER TABLE "StudentGoal" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "StudentGoal_deletedAt_idx" ON "StudentGoal"("deletedAt");
