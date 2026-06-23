-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceLabel" TEXT;

-- CreateIndex
CREATE INDEX "Book_archived_idx" ON "Book"("archived");
