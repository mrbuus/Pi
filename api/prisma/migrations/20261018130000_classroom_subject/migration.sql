-- Ангийн хичээл (эзэн 2026-10-18): null = MATH (анхдагч). Нийгмийн ухааны
-- контент зөвхөн SOCIAL_STUDIES ангийн сурагчдад харагдана (common/access.ts).
-- AlterTable
ALTER TABLE "Classroom" ADD COLUMN IF NOT EXISTS "subject" "Subject";
