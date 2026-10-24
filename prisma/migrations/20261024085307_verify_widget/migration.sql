-- AlterTable
ALTER TABLE "Environment" ADD COLUMN     "allowedOrigins" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "publishableKey" TEXT;

-- AlterTable
ALTER TABLE "Verification" ADD COLUMN     "origin" TEXT,
ADD COLUMN     "returnUrl" TEXT;

-- Give every existing environment a publishable key.
UPDATE "Environment"
SET "publishableKey" = (CASE WHEN "type" = 'LIVE' THEN 'tn_pk_live_' ELSE 'tn_pk_test_' END) || substr(md5(random()::text || "id"), 1, 24)
WHERE "publishableKey" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Environment_publishableKey_key" ON "Environment"("publishableKey");

