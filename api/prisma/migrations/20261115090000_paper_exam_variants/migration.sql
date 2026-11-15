-- Нэгдсэн шалгалт: хувилбар бүрийн түлхүүр, 2-р хэсгийн багц, хуудасны хувилбар — зөвхөн шинэ багана
-- нэмнэ (бүгд NULL-тэй), одоо байгаа өгөгдөлд хүрэхгүй. Идемпотент (STATUS §4).
ALTER TABLE "PaperExamItem" ADD COLUMN IF NOT EXISTS "answerKeys" JSONB;
ALTER TABLE "PaperExamItem" ADD COLUMN IF NOT EXISTS "label" TEXT;
ALTER TABLE "PaperExamItem" ADD COLUMN IF NOT EXISTS "cells" INTEGER;
ALTER TABLE "PaperExamSheet" ADD COLUMN IF NOT EXISTS "variant" TEXT;
