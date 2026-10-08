CREATE TABLE "StaffCapabilityGrant" (
 "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "capability" TEXT NOT NULL,
 "scopeKey" TEXT NOT NULL DEFAULT '', "grantedById" TEXT NOT NULL, "reason" TEXT NOT NULL,
 "expiresAt" TIMESTAMP(3), "revokedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "StaffCapabilityGrant_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "StaffCapabilityGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "StaffCapabilityGrant_userId_capability_scopeKey_key" ON "StaffCapabilityGrant"("userId","capability","scopeKey");
CREATE INDEX "StaffCapabilityGrant_userId_revokedAt_expiresAt_idx" ON "StaffCapabilityGrant"("userId","revokedAt","expiresAt");
