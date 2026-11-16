-- Энэ жилийн мөчлөг эхлэх өдөр (гараар) + сунгалтын «ирээгүй» хугацаа — зөвхөн нэмэх
ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "cycleStartOn" DATE;
ALTER TABLE "TuitionExtension" ADD COLUMN IF NOT EXISTS "gapFrom" DATE;
ALTER TABLE "TuitionExtension" ADD COLUMN IF NOT EXISTS "gapTo" DATE;
