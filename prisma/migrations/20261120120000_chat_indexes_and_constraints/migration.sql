-- Inbox, invites and membership checks filter by user first, but every existing
-- ChatMember index is chat-first, so those queries scanned the table.
CREATE INDEX "ChatMember_userId_kind_status_hidden_idx"
  ON "ChatMember"("userId", "kind", "status", "hidden");

-- Conversation lists and the message-request cap narrow by owner, then
-- kind/recency. The single-column index is the leftmost prefix of the new one.
DROP INDEX IF EXISTS "Chat_ownerId_idx";
CREATE INDEX "Chat_ownerId_kind_createdAt_idx"
  ON "Chat"("ownerId", "kind", "createdAt");

-- A base-word card stores wordFormId = NULL, and @@unique([userId, wordFormId])
-- treats NULLs as distinct, so duplicates were possible. Keep the oldest card
-- per (user, word) so the partial unique index below can be created.
DELETE FROM "UserFlashcard" extra
USING "UserFlashcard" keep
WHERE extra."wordFormId" IS NULL
  AND keep."wordFormId" IS NULL
  AND extra."userId" = keep."userId"
  AND extra."wordId" = keep."wordId"
  AND (extra."createdAt", extra."id") > (keep."createdAt", keep."id");

CREATE UNIQUE INDEX "UserFlashcard_userId_wordId_base_key"
  ON "UserFlashcard"("userId", "wordId")
  WHERE "wordFormId" IS NULL;

-- A member row is either a human or a persona: never both, never neither.
ALTER TABLE "ChatMember"
  ADD CONSTRAINT "ChatMember_one_subject"
  CHECK ((("userId" IS NOT NULL)::int + ("personaId" IS NOT NULL)::int) = 1);
