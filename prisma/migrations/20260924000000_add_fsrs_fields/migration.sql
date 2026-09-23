-- Add FSRS v4 (Difficulty, Stability, Retrievability) fields to UserFlashcard
ALTER TABLE "UserFlashcard" ADD COLUMN IF NOT EXISTS "difficulty" DOUBLE PRECISION;
ALTER TABLE "UserFlashcard" ADD COLUMN IF NOT EXISTS "stability" DOUBLE PRECISION;
ALTER TABLE "UserFlashcard" ADD COLUMN IF NOT EXISTS "retrievability" DOUBLE PRECISION;

-- Add FSRS v4 (Difficulty, Stability, Retrievability) fields to UserKanji
ALTER TABLE "UserKanji" ADD COLUMN IF NOT EXISTS "difficulty" DOUBLE PRECISION;
ALTER TABLE "UserKanji" ADD COLUMN IF NOT EXISTS "stability" DOUBLE PRECISION;
ALTER TABLE "UserKanji" ADD COLUMN IF NOT EXISTS "retrievability" DOUBLE PRECISION;
