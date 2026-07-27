-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('OPEN', 'CLOSED', 'COMING_SOON');

-- CreateEnum
CREATE TYPE "SubjectAvailability" AS ENUM ('CLASSROOM_ONLY', 'ONLINE_ONLY', 'BOTH');

-- AlterEnum
ALTER TYPE "Subject" ADD VALUE 'SAT';

-- AlterTable: "subjects" (Subject[]) -г эхлээд NULL зөвшөөрөлтэйгээр нэмнэ —
-- дараа нь хуучин "subject" (deprecated LeadSubject) баганаас бэкфилл хийж
-- дуусаад л NOT NULL болгоно (одоо байгаа мөрүүд хоосон орфон үлдэхгүй байхын
-- тулд).
ALTER TABLE "Lead" ADD COLUMN "subjects" "Subject"[];

UPDATE "Lead" SET "subjects" = ARRAY['MATH']::"Subject"[] WHERE "subject" = 'MATH';
UPDATE "Lead" SET "subjects" = ARRAY['SOCIAL_STUDIES']::"Subject"[] WHERE "subject" = 'SOCIAL_STUDIES';
UPDATE "Lead" SET "subjects" = ARRAY['MATH', 'SOCIAL_STUDIES']::"Subject"[] WHERE "subject" = 'BOTH';

ALTER TABLE "Lead" ALTER COLUMN "subjects" SET NOT NULL;

-- CreateTable
CREATE TABLE "EnrollmentWindow" (
    "id" TEXT NOT NULL,
    "subject" "Subject" NOT NULL,
    "status" "EnrollmentStatus" NOT NULL,
    "availability" "SubjectAvailability" NOT NULL,
    "note" TEXT,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnrollmentWindow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentWindow_subject_key" ON "EnrollmentWindow"("subject");

-- Seed: эзний тогтоосон анхны дүрэм (2026-07-27 — CLAUDE.md-ийн ТОМООХОН
-- ДҮРЭМ). "updatedById" = 'system' — жинхэнэ хэрэглэгч хийгээгүй, migration
-- дотор автоматаар үүссэн тул; Багш+/Админ дараа нь PATCH-аар өөрчлөх бүрд
-- бодит actorId-гаар солигдоно.
INSERT INTO "EnrollmentWindow" ("id", "subject", "status", "availability", "updatedById", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'MATH', 'OPEN', 'BOTH', 'system', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'SOCIAL_STUDIES', 'OPEN', 'CLASSROOM_ONLY', 'system', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'SAT', 'COMING_SOON', 'CLASSROOM_ONLY', 'system', CURRENT_TIMESTAMP);
