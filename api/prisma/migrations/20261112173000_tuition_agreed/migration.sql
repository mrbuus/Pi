-- Тохирсон (хөнгөлөлттэй) бүтэн жилийн дүн — зөвхөн нэмэх
ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "tuitionAgreed" INTEGER;
