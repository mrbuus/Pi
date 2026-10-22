-- Нэвтрэх хуудасны админ засдаг тайлбар (эзэн 2026-10-22). Additive: ганц шинэ хүснэгт.
-- CreateTable
CREATE TABLE IF NOT EXISTS "LoginText" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "body" TEXT NOT NULL DEFAULT '',
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginText_pkey" PRIMARY KEY ("id")
);
