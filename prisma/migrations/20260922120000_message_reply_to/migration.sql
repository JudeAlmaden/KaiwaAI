-- Reply-to fields on Message (Messenger-style quote preview)
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "replyToId" TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "replyToSenderName" TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "replyToContent" TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "replyToSenderKind" TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "replyToSenderUserId" TEXT;

CREATE INDEX IF NOT EXISTS "Message_replyToId_idx" ON "Message"("replyToId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Message_replyToId_fkey'
  ) THEN
    ALTER TABLE "Message"
      ADD CONSTRAINT "Message_replyToId_fkey"
      FOREIGN KEY ("replyToId") REFERENCES "Message"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
