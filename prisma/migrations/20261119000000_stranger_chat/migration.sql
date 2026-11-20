-- Stranger chat: ephemeral random 1:1 rooms.
--
-- Separate from Chat/ChatMember/Message on purpose — those rows need an owner,
-- invites and hide state and appear in the persistent conversation list. These
-- rows are TTL-scoped and reaped lazily (no cron).

CREATE TABLE "StrangerQueueEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrangerQueueEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StrangerQueueEntry_userId_key" ON "StrangerQueueEntry"("userId");
CREATE INDEX "StrangerQueueEntry_expiresAt_idx" ON "StrangerQueueEntry"("expiresAt");
CREATE INDEX "StrangerQueueEntry_createdAt_idx" ON "StrangerQueueEntry"("createdAt");

CREATE TABLE "StrangerSession" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "endReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastMessageAt" TIMESTAMP(3),

    CONSTRAINT "StrangerSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StrangerSession_status_expiresAt_idx" ON "StrangerSession"("status", "expiresAt");
CREATE INDEX "StrangerSession_expiresAt_idx" ON "StrangerSession"("expiresAt");

CREATE TABLE "StrangerParticipant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),
    "leftReason" TEXT,

    CONSTRAINT "StrangerParticipant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StrangerParticipant_sessionId_userId_key" ON "StrangerParticipant"("sessionId", "userId");
CREATE INDEX "StrangerParticipant_sessionId_idx" ON "StrangerParticipant"("sessionId");
CREATE INDEX "StrangerParticipant_userId_leftAt_idx" ON "StrangerParticipant"("userId", "leftAt");

-- One live room per account. Prisma can't express partial unique indexes, so
-- this is created here only — it is the concurrency guarantee behind
-- matchmaking, not schema drift.
CREATE UNIQUE INDEX "stranger_participant_one_active"
    ON "StrangerParticipant"("userId")
    WHERE "leftAt" IS NULL;

CREATE TABLE "StrangerMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrangerMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StrangerMessage_sessionId_createdAt_idx" ON "StrangerMessage"("sessionId", "createdAt");
CREATE INDEX "StrangerMessage_senderUserId_createdAt_idx" ON "StrangerMessage"("senderUserId", "createdAt");

CREATE TABLE "StrangerBlock" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrangerBlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StrangerBlock_blockerId_blockedId_key" ON "StrangerBlock"("blockerId", "blockedId");
CREATE INDEX "StrangerBlock_blockedId_idx" ON "StrangerBlock"("blockedId");

CREATE TABLE "StrangerReport" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrangerReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StrangerReport_sessionId_idx" ON "StrangerReport"("sessionId");
CREATE INDEX "StrangerReport_reportedId_createdAt_idx" ON "StrangerReport"("reportedId", "createdAt");

ALTER TABLE "StrangerQueueEntry" ADD CONSTRAINT "StrangerQueueEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StrangerParticipant" ADD CONSTRAINT "StrangerParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StrangerSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StrangerParticipant" ADD CONSTRAINT "StrangerParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StrangerMessage" ADD CONSTRAINT "StrangerMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StrangerSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StrangerMessage" ADD CONSTRAINT "StrangerMessage_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "StrangerParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StrangerMessage" ADD CONSTRAINT "StrangerMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StrangerBlock" ADD CONSTRAINT "StrangerBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StrangerBlock" ADD CONSTRAINT "StrangerBlock_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StrangerReport" ADD CONSTRAINT "StrangerReport_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StrangerSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StrangerReport" ADD CONSTRAINT "StrangerReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StrangerReport" ADD CONSTRAINT "StrangerReport_reportedId_fkey" FOREIGN KEY ("reportedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
