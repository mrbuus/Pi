CREATE TABLE "FormulaSection" (
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "icon" TEXT,
    "description" TEXT,
    CONSTRAINT "FormulaSection_pkey" PRIMARY KEY ("slug")
);

ALTER TABLE "Formula"
    ADD COLUMN "slug" TEXT,
    ADD COLUMN "sectionSlug" TEXT,
    ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "level" TEXT NOT NULL DEFAULT 'CORE',
    ADD COLUMN "grade" INTEGER,
    ADD COLUMN "topicSlugs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "general" TEXT,
    ADD COLUMN "variants" JSONB,
    ADD COLUMN "conditions" JSONB,
    ADD COLUMN "explanation" TEXT,
    ADD COLUMN "derivation" JSONB,
    ADD COLUMN "mnemonic" TEXT,
    ADD COLUMN "examples" JSONB,
    ADD COLUMN "commonMistakes" JSONB,
    ADD COLUMN "eeshTip" TEXT,
    ADD COLUMN "relatedSlugs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "widget" TEXT,
    ADD COLUMN "quiz" JSONB,
    ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "Formula_slug_key" ON "Formula"("slug");
CREATE INDEX "Formula_sectionSlug_idx" ON "Formula"("sectionSlug");
CREATE INDEX "Formula_level_idx" ON "Formula"("level");
ALTER TABLE "Formula" ADD CONSTRAINT "Formula_sectionSlug_fkey"
    FOREIGN KEY ("sectionSlug") REFERENCES "FormulaSection"("slug") ON DELETE SET NULL ON UPDATE CASCADE;
