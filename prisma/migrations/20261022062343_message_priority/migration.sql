-- CreateEnum
CREATE TYPE "MessagePriority" AS ENUM ('NORMAL', 'HIGH');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "priority" "MessagePriority" NOT NULL DEFAULT 'NORMAL';
