-- Conversation-scoped memory: a group or DM keeps its own notes per user.
-- Rows with chatId NULL remain persona-global (Kai's shared memory).
ALTER TABLE "Memory" ADD COLUMN "chatId" TEXT;

CREATE INDEX "Memory_userId_chatId_idx" ON "Memory"("userId", "chatId");

ALTER TABLE "Memory"
  ADD CONSTRAINT "Memory_chatId_fkey"
  FOREIGN KEY ("chatId") REFERENCES "Chat"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
