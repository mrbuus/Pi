-- Шалгалт бүрийн аппаас гарах дүрэм (3 = Зөөлөн, 2 = Хатуу) — зөвхөн нэмэх, одоо байгаа мөр 3 (өмнөх зан төлөв)
ALTER TABLE "Test" ADD COLUMN IF NOT EXISTS "leaveLimit" INTEGER NOT NULL DEFAULT 3;
