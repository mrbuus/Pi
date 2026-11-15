-- Нэгдсэн шалгалтын бодлогын тайлбар (чанар, санамж, бодолт) — зөвхөн шинэ хүснэгт нэмнэ, одоо байгааг
-- хөндөхгүй. Идемпотент: deploy дунд тасарч дахин ажиллахад унахгүй (STATUS §4).
-- CreateTable
CREATE TABLE IF NOT EXISTS "PaperExamGuide" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT '',
    "label" TEXT NOT NULL,
    "number" INTEGER,
    "order" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaperExamGuide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PaperExamGuide_examId_variant_label_key" ON "PaperExamGuide"("examId", "variant", "label");
CREATE INDEX IF NOT EXISTS "PaperExamGuide_examId_variant_order_idx" ON "PaperExamGuide"("examId", "variant", "order");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaperExamGuide_examId_fkey') THEN
    ALTER TABLE "PaperExamGuide" ADD CONSTRAINT "PaperExamGuide_examId_fkey" FOREIGN KEY ("examId") REFERENCES "PaperExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
