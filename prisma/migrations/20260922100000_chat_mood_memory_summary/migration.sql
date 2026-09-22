-- AlterTable Chat: per-conversation mood + summary
ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "mood" TEXT NOT NULL DEFAULT 'neutral';
ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "moodScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "moodUpdatedAt" TIMESTAMP(3);
ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "summary" TEXT;
ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "summaryUpToId" TEXT;

-- AlterTable Memory: lastUsedAt + soft supersede
ALTER TABLE "Memory" ADD COLUMN IF NOT EXISTS "lastUsedAt" TIMESTAMP(3);
ALTER TABLE "Memory" ADD COLUMN IF NOT EXISTS "supersededById" TEXT;

CREATE INDEX IF NOT EXISTS "Memory_supersededById_idx" ON "Memory"("supersededById");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Memory_supersededById_fkey'
  ) THEN
    ALTER TABLE "Memory"
      ADD CONSTRAINT "Memory_supersededById_fkey"
      FOREIGN KEY ("supersededById") REFERENCES "Memory"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
