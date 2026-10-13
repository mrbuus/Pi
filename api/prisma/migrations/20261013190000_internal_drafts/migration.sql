-- «Дотоод» ноорог: ажилтны бодлого/тестийн ноорог (зөвхөн НЭМЭХ, Problem/Test-д хүрэхгүй)
CREATE TABLE IF NOT EXISTS "DraftSet" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "subject" "Subject" NOT NULL DEFAULT 'MATH',
    "chapterId" TEXT,
    "topic" VARCHAR(120),
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "updatedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "publishedTestId" TEXT,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "DraftSet_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DraftSet_deletedAt_updatedAt_idx" ON "DraftSet"("deletedAt", "updatedAt");

CREATE TABLE IF NOT EXISTS "DraftBlock" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "kind" VARCHAR(16) NOT NULL DEFAULT 'CHOICE',
    "statement" TEXT NOT NULL DEFAULT '',
    "choices" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "answer" VARCHAR(100),
    "solution" TEXT,
    "imageKey" TEXT,
    "tag" VARCHAR(120),
    "points" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 0,
    "publishedProblemId" TEXT,
    "updatedById" TEXT NOT NULL,
    "updatedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DraftBlock_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DraftBlock_setId_order_idx" ON "DraftBlock"("setId", "order");
CREATE INDEX IF NOT EXISTS "DraftBlock_imageKey_idx" ON "DraftBlock"("imageKey");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DraftBlock_setId_fkey') THEN
        ALTER TABLE "DraftBlock" ADD CONSTRAINT "DraftBlock_setId_fkey"
            FOREIGN KEY ("setId") REFERENCES "DraftSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "DraftEvent" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "blockId" TEXT,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "action" VARCHAR(32) NOT NULL,
    "summary" VARCHAR(300) NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DraftEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DraftEvent_setId_at_idx" ON "DraftEvent"("setId", "at");
