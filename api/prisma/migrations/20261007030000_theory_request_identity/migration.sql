-- AlterTable
ALTER TABLE "TheoryBlock" ADD COLUMN     "clientRequestId" TEXT,
ADD COLUMN     "createdById" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TheoryBlock_createdById_clientRequestId_key" ON "TheoryBlock"("createdById", "clientRequestId");

