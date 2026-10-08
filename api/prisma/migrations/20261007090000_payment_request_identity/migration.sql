ALTER TABLE "Payment" ADD COLUMN "clientRequestId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "normalizedRequestHash" TEXT;
ALTER TABLE "Payment" ADD COLUMN "invoiceAttemptedAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "qpayCheckoutSnapshot" JSONB;
CREATE UNIQUE INDEX "Payment_userId_clientRequestId_key" ON "Payment"("userId", "clientRequestId");
