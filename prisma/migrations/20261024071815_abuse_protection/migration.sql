-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "liveApprovedAt" TIMESTAMP(3),
ADD COLUMN     "liveReviewRequestedAt" TIMESTAMP(3),
ADD COLUMN     "liveUseCase" TEXT,
ADD COLUMN     "status" "OrgStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedReason" TEXT,
ADD COLUMN     "website" TEXT;

-- Organizations that existed before live review are trusted: approve them.
UPDATE "Organization" SET "liveApprovedAt" = NOW() WHERE "liveApprovedAt" IS NULL;
