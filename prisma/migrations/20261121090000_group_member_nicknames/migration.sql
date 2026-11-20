-- Per-group display name for human members (owner or the member can set it).
ALTER TABLE "ChatMember" ADD COLUMN "nickname" TEXT;
