-- Сайтад сүүлд орсон мөч (эзэн 2026-10-13). Нэмэлт, nullable — хуучин мөрөнд нөлөөгүй.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);
