ALTER TABLE "Payment" ADD COLUMN "storePurchaseId" TEXT;
CREATE INDEX "Payment_storePurchaseId_idx" ON "Payment"("storePurchaseId");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_storePurchaseId_fkey" FOREIGN KEY ("storePurchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
