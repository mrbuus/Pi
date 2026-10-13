-- Төлбөрийн тэмдэглэлд амласан өдөр (нэмэлт, nullable — өгөгдөл устгахгүй)
ALTER TABLE "StudentNote" ADD COLUMN IF NOT EXISTS "promisedOn" DATE;
