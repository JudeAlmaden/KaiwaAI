-- Read-only preflight on the current database (2026-11-20): 0 duplicate
-- base-word groups, 0 ChatMember rows with neither/both subjects, 10 members /
-- 5 chats / 156 flashcards. Re-run the three SELECTs in the PR/ops note before
-- applying this to a bigger database.
--
-- NOTE: Prisma wraps each migration in a transaction, so CREATE INDEX
-- CONCURRENTLY is not available here. On a large table, run the two CREATE INDEX
-- statements by hand outside a transaction (CONCURRENTLY, then drop the old
-- index), and let this migration be a no-op for them — here the tables are tiny.
-- lock_timeout makes a blocked statement fail fast instead of queueing every
-- later query behind it.

SET LOCAL lock_timeout = '5s';

-- Inbox, invites and membership checks filter by user first, but every existing
-- ChatMember index is chat-first, so those queries scanned the table.
CREATE INDEX "ChatMember_userId_kind_status_hidden_idx"
  ON "ChatMember"("userId", "kind", "status", "hidden");

-- Conversation lists and the message-request cap narrow by owner, then
-- kind/recency. Create the replacement before dropping the old single-column
-- index, so owner lookups are never unindexed.
CREATE INDEX "Chat_ownerId_kind_createdAt_idx"
  ON "Chat"("ownerId", "kind", "createdAt");
DROP INDEX IF EXISTS "Chat_ownerId_idx";

-- A base-word card stores wordFormId = NULL, and @@unique([userId, wordFormId])
-- treats NULLs as distinct, so duplicates were possible. Keep the card with the
-- most review progress (then the most recent review, then the oldest row) so the
-- partial unique index below can be created without losing study history.
WITH ranked AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "userId", "wordId"
      ORDER BY
        "timesReviewed" DESC,
        "lastReviewedAt" DESC NULLS LAST,
        "createdAt" ASC,
        "id" ASC
    ) AS rn
  FROM "UserFlashcard"
  WHERE "wordFormId" IS NULL AND "wordId" IS NOT NULL
)
DELETE FROM "UserFlashcard" duplicate
USING ranked
WHERE duplicate."id" = ranked."id" AND ranked.rn > 1;

CREATE UNIQUE INDEX "UserFlashcard_userId_wordId_base_key"
  ON "UserFlashcard"("userId", "wordId")
  WHERE "wordFormId" IS NULL;

-- A member row is either a human or a persona: never both, never neither.
-- NOT VALID applies to new rows immediately and skips the full-table lock;
-- VALIDATE then checks existing rows under SHARE UPDATE EXCLUSIVE (reads and
-- writes continue), and any violator aborts the whole migration.
ALTER TABLE "ChatMember"
  ADD CONSTRAINT "ChatMember_one_subject"
  CHECK ((("userId" IS NOT NULL)::int + ("personaId" IS NOT NULL)::int) = 1)
  NOT VALID;

ALTER TABLE "ChatMember" VALIDATE CONSTRAINT "ChatMember_one_subject";
