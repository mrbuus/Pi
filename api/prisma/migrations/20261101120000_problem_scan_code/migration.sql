-- Номд хэвлэх QR код (Photomath маягийн «зураг дарж бодолт харах», S1).
-- Зөвхөн нэмэлт багана — одоо байгаа өгөгдөлд хүрэхгүй.
ALTER TABLE "Problem" ADD COLUMN IF NOT EXISTS "scanCode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Problem_scanCode_key" ON "Problem"("scanCode");
