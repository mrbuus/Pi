-- Хувилбар бүрийн багцын нэр; сурагчид дэлгэрэнгүй нээх тохиргоо
ALTER TABLE "PaperExamItem" ADD COLUMN "labels" JSONB;
ALTER TABLE "PaperExam" ADD COLUMN "studentDetail" BOOLEAN NOT NULL DEFAULT false;
-- Өмнөх шалгалтууд (Нэгдсэн шалгалт 1) бүрэн нээлттэй хэвээр
UPDATE "PaperExam" SET "studentDetail" = true;
