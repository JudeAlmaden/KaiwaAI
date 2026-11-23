-- AlterTable
ALTER TABLE "UserKanji" ADD COLUMN "lapses" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "UserFlashcard" ADD COLUMN "lapses" INTEGER NOT NULL DEFAULT 0;

-- Backfill from review history: each grade increments timesReviewed, and each
-- grade 0 resets repetitions, so the reviews not represented by repetitions
-- are lapses (never negative).
UPDATE "UserKanji" SET "lapses" = GREATEST(0, "timesReviewed" - "repetitions");
UPDATE "UserFlashcard" SET "lapses" = GREATEST(0, "timesReviewed" - "repetitions");
