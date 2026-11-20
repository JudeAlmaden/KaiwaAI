-- Kai personalities: Hana/Riku/Sora stop being characters and become attitudes
-- of Kai, and every Kai conversation (1:1 or group) owns one attitude.
--
-- Applied in one migration because none of these columns have shipped yet.
-- Legacy rows are converted in place so existing chats, messages and memories
-- keep working and no FK needs to be recreated from scratch.

SET LOCAL lock_timeout = '5s';

-- ── Schema ──────────────────────────────────────────────────────────────────
ALTER TABLE "Persona" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'custom';
ALTER TABLE "Persona" ADD COLUMN "label" TEXT;
ALTER TABLE "Persona" ADD COLUMN "modeOfId" TEXT;

ALTER TABLE "Chat" ADD COLUMN "activeModeId" TEXT;

CREATE INDEX "Persona_modeOfId_idx" ON "Persona"("modeOfId");
CREATE INDEX "Chat_activeModeId_idx" ON "Chat"("activeModeId");

ALTER TABLE "Persona"
  ADD CONSTRAINT "Persona_modeOfId_fkey"
  FOREIGN KEY ("modeOfId") REFERENCES "Persona"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Chat"
  ADD CONSTRAINT "Chat_activeModeId_fkey"
  FOREIGN KEY ("activeModeId") REFERENCES "Persona"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Built-ins: Kai is Kai, the starters are attitudes ───────────────────────
-- Only `builtin` rows are touched, so a user's custom "Hana" stays custom.
UPDATE "Persona"
SET "kind" = 'kai'
WHERE "builtin" = true AND lower(btrim("name")) = 'kai';

UPDATE "Persona" p
SET "kind" = 'kai_mode',
    "label" = CASE lower(btrim(p."name"))
      WHEN 'hana' THEN 'Calm'
      WHEN 'riku' THEN 'Playful'
      WHEN 'sora' THEN 'Thoughtful'
    END,
    "modeOfId" = k."id"
FROM (
  SELECT "id"
  FROM "Persona"
  WHERE "builtin" = true AND lower(btrim("name")) = 'kai'
  ORDER BY "createdAt" ASC, "id" ASC
  LIMIT 1
) k
WHERE p."builtin" = true
  AND lower(btrim(p."name")) IN ('hana', 'riku', 'sora');

-- The old prompts introduced themselves as other people. Attitudes are Kai, so
-- rewrite them in terms of how Kai speaks (the UI never shows these names).
UPDATE "Persona"
SET "personality" = CASE lower(btrim("name"))
  WHEN 'hana' THEN 'Speak as Kai in a calm, patient way: explain grammar clearly and gently, choose particles precisely, and encourage accuracy without being strict. Keep Kai warm, but a little more measured and formal than usual.'
  WHEN 'riku' THEN 'Speak as Kai in a playful, casual way: use slang and casual Japanese, be a little cheeky, and keep things fun. Explain the vibe behind phrases, and stay recognizably Kai rather than becoming a different person.'
  WHEN 'sora' THEN 'Speak as Kai in a thoughtful, soft-spoken way: ask good questions, slow down, and let the conversation breathe. Stay curious and listen closely, and keep Kai warm rather than distant.'
END
WHERE "builtin" = true
  AND "kind" = 'kai_mode'
  AND lower(btrim("name")) IN ('hana', 'riku', 'sora');

-- ── Conversations: replace the attitude's row with Kai ──────────────────────
-- The chat keeps the attitude in activeModeId, so its voice does not change.
WITH converted AS (
  SELECT
    cm."id" AS "memberId",
    cm."chatId" AS "chatId",
    cm."personaId" AS "modeId",
    p."modeOfId" AS "kaiId"
  FROM "ChatMember" cm
  JOIN "Chat" c ON c."id" = cm."chatId"
  JOIN "Persona" p ON p."id" = cm."personaId"
  WHERE c."kind" IN ('group', 'persona')
    AND cm."kind" = 'persona'
    AND p."kind" = 'kai_mode'
    AND p."modeOfId" IS NOT NULL
    -- Never create a second Kai member: @@unique([chatId, personaId]).
    AND NOT EXISTS (
      SELECT 1 FROM "ChatMember" kai
      WHERE kai."chatId" = cm."chatId"
        AND kai."kind" = 'persona'
        AND kai."personaId" = p."modeOfId"
    )
), applied AS (
  UPDATE "Chat" ch
  SET "activeModeId" = cv."modeId"
  FROM converted cv
  WHERE ch."id" = cv."chatId" AND ch."activeModeId" IS NULL
  RETURNING ch."id"
)
UPDATE "ChatMember" cm
SET "personaId" = cv."kaiId"
FROM converted cv
WHERE cm."id" = cv."memberId";

-- A 1:1 chat is named after the character it used to hold; it is Kai now. Old
-- 1:1 preset chats stay as separate threads (their histories and moods differ),
-- but they all read as Kai with the attitude chosen above.
-- Scoped through the member so a custom persona someone happened to name
-- "Hana" keeps its own chat name.
UPDATE "Chat" ch
SET "name" = 'Kai'
FROM "ChatMember" cm, "Persona" p
WHERE cm."chatId" = ch."id"
  AND cm."kind" = 'persona'
  AND cm."personaId" = p."id"
  AND p."kind" = 'kai'
  AND ch."kind" = 'persona'
  AND ch."name" IN ('Hana', 'Riku', 'Sora');

UPDATE "Message" m
SET "senderName" = 'Kai'
FROM "Chat" c, "ChatMember" cm, "Persona" p
WHERE m."chatId" = c."id"
  AND c."kind" IN ('group', 'persona')
  AND m."memberId" = cm."id"
  AND cm."personaId" = p."id"
  AND p."kind" = 'kai'
  AND m."senderKind" = 'persona'
  AND m."senderName" <> 'Kai';

-- ── Memories: attitudes share Kai's memory ──────────────────────────────────
-- Otherwise every old preset would keep an invisible memory bucket while the
-- Kai in the chat remembers nothing.
UPDATE "Memory" m
SET "personaId" = p."modeOfId"
FROM "Persona" p
WHERE m."personaId" = p."id"
  AND p."kind" = 'kai_mode'
  AND p."modeOfId" IS NOT NULL;
