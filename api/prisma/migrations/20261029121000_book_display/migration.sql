-- Сурагчид харагдах номын нэр/дараалал/нуух (additive, өгөгдөл устгахгүй)
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "displayName" TEXT;
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "displayOrder" INTEGER;
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "studentHidden" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Book_studentHidden_displayOrder_idx" ON "Book"("studentHidden", "displayOrder");
