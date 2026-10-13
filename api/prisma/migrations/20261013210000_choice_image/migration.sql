-- Сонголт бүрт зураг (A–E хариу график/зураг байх бодлого). Нэмэлт, nullable.
ALTER TABLE "ProblemChoice" ADD COLUMN "imageKey" TEXT;
-- Файлын эрх шалгахад (file-authorization) key-ээр хайна
CREATE INDEX "ProblemChoice_imageKey_idx" ON "ProblemChoice"("imageKey");
