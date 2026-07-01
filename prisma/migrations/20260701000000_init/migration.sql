-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "geminiKeyEnc" TEXT,
    "maxNewWords" INTEGER NOT NULL DEFAULT 1,
    "level" TEXT NOT NULL DEFAULT 'N5',
    "outreachMode" TEXT NOT NULL DEFAULT 'off',
    "outreachTimes" TEXT NOT NULL DEFAULT '[]',
    "quietStart" INTEGER NOT NULL DEFAULT 22,
    "quietEnd" INTEGER NOT NULL DEFAULT 8,
    "consecutiveIgnored" INTEGER NOT NULL DEFAULT 0,
    "lastOutreachAt" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3),
    "streakCount" INTEGER NOT NULL DEFAULT 0,
    "streakBestCount" INTEGER NOT NULL DEFAULT 0,
    "lastStreakDay" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Persona" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "blurb" TEXT NOT NULL DEFAULT '',
    "personality" TEXT NOT NULL,
    "avatar" TEXT NOT NULL DEFAULT '🤖',
    "builtin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "addresseeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'group',
    "ownerId" TEXT NOT NULL,
    "apiKeyEnc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'accepted',
    "userId" TEXT,
    "personaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMessage" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "memberId" TEXT,
    "senderUserId" TEXT,
    "senderName" TEXT NOT NULL,
    "senderKind" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "english" TEXT,
    "tokens" TEXT,
    "correction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "english" TEXT,
    "tokens" TEXT,
    "correction" TEXT,
    "proactive" BOOLEAN NOT NULL DEFAULT false,
    "replyToId" TEXT,
    "dayKey" TEXT NOT NULL,
    "summarized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flashcard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "reading" TEXT NOT NULL,
    "romaji" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "partOfSpeech" TEXT NOT NULL,
    "jlptTier" TEXT NOT NULL DEFAULT 'unknown',
    "meaningContexts" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 0,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "timesReviewed" INTEGER NOT NULL DEFAULT 0,
    "exposures" INTEGER NOT NULL DEFAULT 0,
    "nextReview" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReviewedAt" TIMESTAMP(3),
    "sourceMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Flashcard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DaySummary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "partial" BOOLEAN NOT NULL DEFAULT false,
    "monthKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DaySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Memory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "personaId" TEXT,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'fact',
    "importance" INTEGER NOT NULL DEFAULT 1,
    "sourceDayKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kanji" (
    "id" TEXT NOT NULL,
    "character" TEXT NOT NULL,
    "strokes" INTEGER NOT NULL,
    "grade" INTEGER,
    "frequency" INTEGER,
    "jlptLevel" INTEGER,
    "meanings" TEXT NOT NULL,
    "readingsOn" TEXT NOT NULL,
    "readingsKun" TEXT NOT NULL,
    "radicals" TEXT NOT NULL,
    "wkLevel" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kanji_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanjiMnemonic" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kanjiId" TEXT NOT NULL,
    "mnemonic" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KanjiMnemonic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Persona_userId_idx" ON "Persona"("userId");

-- CreateIndex
CREATE INDEX "Friendship_addresseeId_status_idx" ON "Friendship"("addresseeId", "status");

-- CreateIndex
CREATE INDEX "Friendship_requesterId_status_idx" ON "Friendship"("requesterId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_requesterId_addresseeId_key" ON "Friendship"("requesterId", "addresseeId");

-- CreateIndex
CREATE INDEX "Group_ownerId_idx" ON "Group"("ownerId");

-- CreateIndex
CREATE INDEX "GroupMember_groupId_idx" ON "GroupMember"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_userId_key" ON "GroupMember"("groupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_personaId_key" ON "GroupMember"("groupId", "personaId");

-- CreateIndex
CREATE INDEX "GroupMessage_groupId_createdAt_idx" ON "GroupMessage"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_userId_createdAt_idx" ON "Message"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_userId_dayKey_idx" ON "Message"("userId", "dayKey");

-- CreateIndex
CREATE INDEX "Message_replyToId_idx" ON "Message"("replyToId");

-- CreateIndex
CREATE INDEX "Flashcard_userId_status_idx" ON "Flashcard"("userId", "status");

-- CreateIndex
CREATE INDEX "Flashcard_userId_nextReview_idx" ON "Flashcard"("userId", "nextReview");

-- CreateIndex
CREATE INDEX "Flashcard_userId_partOfSpeech_idx" ON "Flashcard"("userId", "partOfSpeech");

-- CreateIndex
CREATE UNIQUE INDEX "Flashcard_userId_word_key" ON "Flashcard"("userId", "word");

-- CreateIndex
CREATE INDEX "DaySummary_userId_dayKey_idx" ON "DaySummary"("userId", "dayKey");

-- CreateIndex
CREATE UNIQUE INDEX "DaySummary_userId_dayKey_key" ON "DaySummary"("userId", "dayKey");

-- CreateIndex
CREATE INDEX "Memory_userId_category_idx" ON "Memory"("userId", "category");

-- CreateIndex
CREATE INDEX "Memory_userId_personaId_idx" ON "Memory"("userId", "personaId");

-- CreateIndex
CREATE UNIQUE INDEX "Kanji_character_key" ON "Kanji"("character");

-- CreateIndex
CREATE INDEX "Kanji_jlptLevel_idx" ON "Kanji"("jlptLevel");

-- CreateIndex
CREATE INDEX "Kanji_grade_idx" ON "Kanji"("grade");

-- CreateIndex
CREATE INDEX "Kanji_frequency_idx" ON "Kanji"("frequency");

-- CreateIndex
CREATE INDEX "Kanji_character_idx" ON "Kanji"("character");

-- CreateIndex
CREATE INDEX "KanjiMnemonic_userId_idx" ON "KanjiMnemonic"("userId");

-- CreateIndex
CREATE INDEX "KanjiMnemonic_kanjiId_idx" ON "KanjiMnemonic"("kanjiId");

-- CreateIndex
CREATE UNIQUE INDEX "KanjiMnemonic_userId_kanjiId_key" ON "KanjiMnemonic"("userId", "kanjiId");

-- AddForeignKey
ALTER TABLE "Persona" ADD CONSTRAINT "Persona_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_addresseeId_fkey" FOREIGN KEY ("addresseeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMessage" ADD CONSTRAINT "GroupMessage_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMessage" ADD CONSTRAINT "GroupMessage_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "GroupMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMessage" ADD CONSTRAINT "GroupMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_sourceMessageId_fkey" FOREIGN KEY ("sourceMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DaySummary" ADD CONSTRAINT "DaySummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanjiMnemonic" ADD CONSTRAINT "KanjiMnemonic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanjiMnemonic" ADD CONSTRAINT "KanjiMnemonic_kanjiId_fkey" FOREIGN KEY ("kanjiId") REFERENCES "Kanji"("id") ON DELETE CASCADE ON UPDATE CASCADE;
