-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'AWAITING_CONTACT', 'VERIFIED', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "externalId" TEXT,
    "expectedPhone" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "phone" TEXT,
    "telegramUserId" TEXT,
    "telegramChatId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Verification_token_key" ON "Verification"("token");

-- CreateIndex
CREATE INDEX "Verification_environmentId_createdAt_idx" ON "Verification"("environmentId", "createdAt");

-- CreateIndex
CREATE INDEX "Verification_telegramChatId_status_idx" ON "Verification"("telegramChatId", "status");

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
