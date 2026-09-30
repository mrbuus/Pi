-- Схем ба ӨС-ийн зөрүүг засна (2026-09-27).
--
-- 20260808_add_external_teachers_purchases_expenses_refunds миграци эдгээр
-- баганыг TEXT-ээр үүсгэсэн атал schema.prisma нь enum гэж зарласан. Prisma
-- эдгээр баганаар шүүхдээ SQL-д enum төрөл рүү хөрвүүлдэг тул прод дээр
--   DriverAdapterError: type "public.ProductKind" does not exist
-- гэж унадаг. Алдааны дэвтэр (T12) ProductItem-ийг шүүдэг болсноор энэ
-- нуугдмал зөрүү сурагчийн хуудсыг 500 болгосноор илэрсэн.
--
-- Гурван хүснэгт бүгд ХООСОН (ProductItem 0, ExpenseRecord 0, TuitionRefund 0)
-- тул хөрвүүлэлт өгөгдөлд нөлөөлөхгүй. Хэрэв мөр нэмэгдсэн бол USING хэсэг нь
-- хүчинтэй утгыг хөрвүүлж, буруу утга дээр миграци зогсоно (чимээгүй алдахгүй).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductKind') THEN
    CREATE TYPE "ProductKind" AS ENUM ('TEST', 'BOOK', 'PASS');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExpenseCategory') THEN
    CREATE TYPE "ExpenseCategory" AS ENUM ('SALARY', 'RENT', 'UTILITIES', 'MARKETING', 'MATERIALS', 'EQUIPMENT', 'OTHER');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RefundStatus') THEN
    CREATE TYPE "RefundStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PAID', 'CANCELLED');
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ProductItem' AND column_name = 'kind' AND udt_name = 'text'
  ) THEN
    ALTER TABLE "ProductItem" ALTER COLUMN "kind" TYPE "ProductKind" USING "kind"::"ProductKind";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ExpenseRecord' AND column_name = 'category' AND udt_name = 'text'
  ) THEN
    ALTER TABLE "ExpenseRecord" ALTER COLUMN "category" TYPE "ExpenseCategory" USING "category"::"ExpenseCategory";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'TuitionRefund' AND column_name = 'status' AND udt_name = 'text'
  ) THEN
    ALTER TABLE "TuitionRefund" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "TuitionRefund" ALTER COLUMN "status" TYPE "RefundStatus" USING "status"::"RefundStatus";
    ALTER TABLE "TuitionRefund" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
  END IF;
END $$;
