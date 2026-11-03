-- Гэрийн даалгаврын идэвхийн хяналт (эзэн 2026-11-03): зөвхөн нэмэлт баганууд, өгөгдөлд хүрэхгүй
ALTER TABLE "HomeworkAttempt" ADD COLUMN "activeSec" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "HomeworkAttempt" ADD COLUMN "awaySec" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "HomeworkAttempt" ADD COLUMN "leaveCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "HomeworkAttempt" ADD COLUMN "openCount" INTEGER NOT NULL DEFAULT 0;
