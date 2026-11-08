-- Багшийн ажилласан цаг, данс, цагийн хөлс (эзэн 2026-11-08)
-- Зөвхөн НЭМЭХ өөрчлөлт — одоо байгаа өгөгдөлд хүрэхгүй.

CREATE TABLE "TeacherWorkHours" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hundredths" INTEGER,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherWorkHours_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TeacherWorkHours_teacherId_date_key" ON "TeacherWorkHours"("teacherId", "date");
CREATE INDEX "TeacherWorkHours_date_idx" ON "TeacherWorkHours"("date");

CREATE TABLE "TeacherBankAccount" (
    "teacherId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "holderName" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherBankAccount_pkey" PRIMARY KEY ("teacherId")
);

CREATE TABLE "TeacherPayRate" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "ratePerHour" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TeacherPayRate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TeacherPayRate_teacherId_effectiveFrom_idx" ON "TeacherPayRate"("teacherId", "effectiveFrom");

-- «Цаг бөглөх» эрх (teacher-hours.edit) — эзний жагсаасан 5 Багш+ (Админ үүргээр эзэмшинэ).
-- Хэрэглэгч байхгүй / Багш+ биш / архивлагдсан бол алгасна; дахин ажиллуулахад давхардахгүй.
INSERT INTO "StaffCapabilityGrant" ("id", "userId", "capability", "scopeKey", "grantedById", "reason", "createdAt", "updatedAt")
SELECT 'th-edit-' || u."id", u."id", 'teacher-hours.edit', '', 'cmuzbshof00008p7ntitgkur0',
       'Эзний шийдвэр (2026-11-08): багшийн ажилласан цагийн хүснэгтийг бөглөнө',
       (now() AT TIME ZONE 'UTC'), (now() AT TIME ZONE 'UTC')
FROM "User" u
WHERE u."id" IN (
    'cmuzc9vry0002kq7nidiofdds', -- О. Баасанжав
    'cmuzc9vol0000kq7noepdktaj', -- О. Баасансүрэн
    'cmv3ihjo80000t77nxi5ofhzs', -- Дуламсүрэн
    'cmuzc9vth0003kq7not4vwfsm', -- Ц. Энхсайхан
    'cmuzc9vqd0001kq7ny74s0ynr'  -- Э. Бадрал
  )
  AND u."role" = 'TEACHER_PLUS'
  AND u."archivedAt" IS NULL
ON CONFLICT ("userId", "capability", "scopeKey") DO NOTHING;

-- Олголт бүрийг аудитад (эрхийн матрицын олголттой ижил хэлбэр).
INSERT INTO "AuditLog" ("id", "actorId", "actorRole", "action", "entity", "entityId", "after", "reason", "at")
SELECT 'th-edit-audit-' || g."userId", 'cmuzbshof00008p7ntitgkur0', 'ADMIN', 'GRANT', 'StaffCapabilityGrant', g."id",
       jsonb_build_object('userId', g."userId", 'capability', g."capability", 'scopeKey', g."scopeKey", 'expiresAt', NULL),
       g."reason", (now() AT TIME ZONE 'UTC')
FROM "StaffCapabilityGrant" g
WHERE g."id" LIKE 'th-edit-%' AND g."capability" = 'teacher-hours.edit'
ON CONFLICT ("id") DO NOTHING;
