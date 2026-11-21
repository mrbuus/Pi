-- Шалгалтын нийтлэг цонх (нээх/хаах цаг) ба цаасан шалгалтын горим — зөвхөн нэмэх, NULL = өмнөх зан төлөв
ALTER TABLE "Test" ADD COLUMN IF NOT EXISTS "opensAt" TIMESTAMP(3) NULL;
ALTER TABLE "Test" ADD COLUMN IF NOT EXISTS "closesAt" TIMESTAMP(3) NULL;
ALTER TABLE "Test" ADD COLUMN IF NOT EXISTS "paperMode" BOOLEAN NULL;
