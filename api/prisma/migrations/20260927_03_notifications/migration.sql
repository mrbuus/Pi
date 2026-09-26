ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "calendarTokenHash" TEXT,
  ADD COLUMN IF NOT EXISTS "calendarTokenVersion" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "User_calendarTokenHash_key"
  ON "User" ("calendarTokenHash");

DO $$
BEGIN
  CREATE TYPE "NotificationKind" AS ENUM (
    'PAYMENT_DUE', 'HOMEWORK', 'SCHEDULE_CHANGE', 'ANNOUNCEMENT', 'SYSTEM'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" "NotificationKind" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "link" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Notification_userId_fkey'
      AND conrelid = '"Notification"'::regclass
  ) THEN
    ALTER TABLE "Notification"
      ADD CONSTRAINT "Notification_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Notification_userId_readAt_idx"
  ON "Notification" ("userId", "readAt");
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx"
  ON "Notification" ("userId", "createdAt");
