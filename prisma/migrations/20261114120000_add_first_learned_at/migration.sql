-- Add firstLearnedAt: the moment a card first crossed from never-graded to
-- graded. Used for the daily new-card ceiling, because `repetitions = 1` is
-- also true for an old card that just lapsed and returned.
ALTER TABLE "UserFlashcard" ADD COLUMN IF NOT EXISTS "firstLearnedAt" TIMESTAMP(3);
ALTER TABLE "UserKanji" ADD COLUMN IF NOT EXISTS "firstLearnedAt" TIMESTAMP(3);
