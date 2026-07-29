-- CreateEnum
CREATE TYPE "LateRange" AS ENUM ('FIVE_TO_TEN', 'TEN_TO_THIRTY', 'THIRTY_TO_SIXTY', 'OVER_ONE_HOUR');

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "lateRange" "LateRange";
