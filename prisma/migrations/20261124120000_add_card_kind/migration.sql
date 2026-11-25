-- CreateEnum
CREATE TYPE "CardKind" AS ENUM ('word', 'phrase');

-- AlterTable
ALTER TABLE "UserFlashcard" ADD COLUMN "kind" "CardKind" NOT NULL DEFAULT 'word';

-- Backfill: cards linked to a real Phrase row, or to a word the AI seeded with
-- part-of-speech "phrase", were saved as phrases. Everything else stays a word.
UPDATE "UserFlashcard" AS uf
SET "kind" = 'phrase'
FROM "Word" AS w
WHERE uf."wordId" = w."id" AND w."partOfSpeech" = 'phrase';

UPDATE "UserFlashcard" SET "kind" = 'phrase' WHERE "phraseId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "UserFlashcard_userId_kind_idx" ON "UserFlashcard"("userId", "kind");
