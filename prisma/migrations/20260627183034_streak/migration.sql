-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastStreakDay" TEXT,
ADD COLUMN     "streakBestCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "streakCount" INTEGER NOT NULL DEFAULT 0;
