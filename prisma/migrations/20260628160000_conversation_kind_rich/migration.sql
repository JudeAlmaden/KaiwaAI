-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'group';

-- AlterTable
ALTER TABLE "GroupMessage" ADD COLUMN     "correction" TEXT,
ADD COLUMN     "english" TEXT,
ADD COLUMN     "tokens" TEXT;
