-- AlterEnum
ALTER TYPE "TestType" ADD VALUE 'THEORY';

-- AlterTable
ALTER TABLE "Chapter" ADD COLUMN     "topicId" TEXT;

-- AlterTable
ALTER TABLE "Classroom" ADD COLUMN     "progressChapterId" TEXT;

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Topic_name_key" ON "Topic"("name");

-- CreateIndex
CREATE INDEX "Chapter_topicId_idx" ON "Chapter"("topicId");

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
