-- Асуудалтай хүүхдийн шалгуур (эзэн 2026-10-18). Нэмэлт, nullable.
ALTER TABLE "Classroom" ADD COLUMN IF NOT EXISTS "riskCriteria" JSONB;
