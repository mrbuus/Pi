-- Хичээл батлахад багшийн бичих нэмэлт мэдээлэл (эзэн 2026-10-27):
-- чөлөөт тайлбар, бодсон бодлогын дугаар («1-12, 15, 20» — бичсэнээр нь
-- хадгалж, задалж чадвал тоон жагсаалт). Хуучин мөр null / хоосон үлдэнэ.
-- Зөвхөн НЭМЭХ.

ALTER TABLE "LessonRecord" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "LessonRecord" ADD COLUMN IF NOT EXISTS "problemNumbersText" TEXT;
ALTER TABLE "LessonRecord" ADD COLUMN IF NOT EXISTS "problemNumbers" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
