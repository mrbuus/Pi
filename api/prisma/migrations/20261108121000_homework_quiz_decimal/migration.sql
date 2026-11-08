-- Шалгалтын оноо бутархай байж болно (7.5, эзэн 2026-11-08 19:08): INTEGER → NUMERIC(6,2).
-- Утга алдагдахгүй (бүхэл тоо яг хадгалагдана), дахин ажиллуулахад аюулгүй.
ALTER TABLE "HomeworkQuizScore" ALTER COLUMN "score" TYPE DECIMAL(6,2) USING "score"::DECIMAL(6,2);
