-- Хүснэгтийн горим (Тогтмол / Сондгой-Тэгш) ба хүчинтэй хугацаа — ганц мөр.
CREATE TABLE IF NOT EXISTS "TeacherRosterConfig" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "mode" TEXT NOT NULL DEFAULT 'ALTERNATING',
  "validFrom" DATE,
  "validTo" DATE,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "updatedById" TEXT,
  CONSTRAINT "TeacherRosterConfig_pkey" PRIMARY KEY ("id")
);
