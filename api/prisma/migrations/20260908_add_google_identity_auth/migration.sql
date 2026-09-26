-- CreateEnum
CREATE TYPE "GoogleOAuthPurpose" AS ENUM ('LOGIN', 'LINK');

-- CreateTable
CREATE TABLE "GoogleIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "googleSubject" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "pictureUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleOAuthState" (
    "id" TEXT NOT NULL,
    "stateHash" TEXT NOT NULL,
    "purpose" "GoogleOAuthPurpose" NOT NULL,
    "userId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoogleOAuthState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleLoginExchange" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoogleLoginExchange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleIdentity_userId_key" ON "GoogleIdentity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleIdentity_googleSubject_key" ON "GoogleIdentity"("googleSubject");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleOAuthState_stateHash_key" ON "GoogleOAuthState"("stateHash");

-- CreateIndex
CREATE INDEX "GoogleOAuthState_expiresAt_idx" ON "GoogleOAuthState"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleLoginExchange_codeHash_key" ON "GoogleLoginExchange"("codeHash");

-- CreateIndex
CREATE INDEX "GoogleLoginExchange_expiresAt_idx" ON "GoogleLoginExchange"("expiresAt");

-- AddForeignKey
ALTER TABLE "GoogleIdentity" ADD CONSTRAINT "GoogleIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleOAuthState" ADD CONSTRAINT "GoogleOAuthState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleLoginExchange" ADD CONSTRAINT "GoogleLoginExchange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

