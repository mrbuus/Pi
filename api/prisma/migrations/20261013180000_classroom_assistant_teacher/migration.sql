-- «Ангиуд» (эзэн 2026-10-13): анги дээд тал нь ХОЁР ангийн багштай — үндсэн
-- (teacherId) ба туслах (assistantTeacherId). Зөвхөн НЭМЭХ, хуучин өгөгдөлд нөлөөгүй.
ALTER TABLE "Classroom" ADD COLUMN IF NOT EXISTS "assistantTeacherId" TEXT;

DO $$ BEGIN
  ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_assistantTeacherId_fkey"
    FOREIGN KEY ("assistantTeacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Classroom_assistantTeacherId_idx" ON "Classroom"("assistantTeacherId");
