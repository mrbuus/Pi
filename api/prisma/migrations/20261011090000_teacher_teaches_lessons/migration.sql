-- Хуваарьт оногддог багшийг ялгах (зөвхөн НЭМЭХ)
ALTER TABLE "TeacherProfile" ADD COLUMN IF NOT EXISTS "teachesLessons" BOOLEAN NOT NULL DEFAULT true;
