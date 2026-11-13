-- Remember where a vocabulary card was first saved from, so review can show the
-- exact chat exchange that introduced the word.
ALTER TABLE "UserFlashcard" ADD COLUMN "sourceChatId" TEXT;
ALTER TABLE "UserFlashcard" ADD COLUMN "sourceMessageId" TEXT;
ALTER TABLE "UserFlashcard" ADD COLUMN "sourceContext" TEXT;
