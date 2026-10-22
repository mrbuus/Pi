-- S3 хадгалалт: байт өгөгдлийн санд заавал биш, хуудасны тоо, хадгалах хугацаа
ALTER TABLE "StoredFile" ALTER COLUMN "bytes" DROP NOT NULL;
ALTER TABLE "StoredFile" ADD COLUMN "storage" TEXT NOT NULL DEFAULT 'db';
ALTER TABLE "StoredFile" ADD COLUMN "pages" INTEGER;
ALTER TABLE "StoredFile" ADD COLUMN "expiresAt" TIMESTAMP(3);
CREATE INDEX "StoredFile_expiresAt_idx" ON "StoredFile"("expiresAt");
