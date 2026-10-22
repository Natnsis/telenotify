-- CreateEnum
CREATE TYPE "FallbackStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "Environment" ADD COLUMN     "afroIdentifierId" TEXT,
ADD COLUMN     "afroSenderName" TEXT,
ADD COLUMN     "afroTokenEncrypted" TEXT,
ADD COLUMN     "smsFallbackEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "fallbackAt" TIMESTAMP(3),
ADD COLUMN     "fallbackError" TEXT,
ADD COLUMN     "fallbackProviderId" TEXT,
ADD COLUMN     "fallbackStatus" "FallbackStatus",
ADD COLUMN     "smsFallback" BOOLEAN NOT NULL DEFAULT true;
