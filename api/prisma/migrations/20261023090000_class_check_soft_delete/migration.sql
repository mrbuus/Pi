-- «Чек» устгах (эзэн 2026-10-23): «өгөгдөл хэзээ ч алга болохгүй» — устгах нь
-- ЗӨӨЛӨН. Мөр, тэмдэглэгээ DB-д үлдэнэ; deletedAt-тэй чек ямар ч жагсаалтад
-- харагдахгүй. archivedAt («хаах», сэргээж болно)-аас тусдаа утгатай. Зөвхөн НЭМЭХ.

ALTER TABLE "ClassCheck" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "ClassCheck" ADD COLUMN IF NOT EXISTS "deletedById" TEXT;
