-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PartOfSpeech" AS ENUM ('noun', 'verb', 'adjective', 'adverb', 'particle', 'conjunction', 'interjection', 'expression', 'phrase', 'pronoun', 'counter', 'suffix', 'prefix', 'auxiliary', 'copula', 'unclassified');

-- CreateEnum
CREATE TYPE "VerbType" AS ENUM ('godan', 'ichidan', 'suru', 'kuru', 'irregular');

-- CreateEnum
CREATE TYPE "AdjectiveType" AS ENUM ('i_adjective', 'na_adjective');

-- CreateEnum
CREATE TYPE "FlashcardStatus" AS ENUM ('new', 'learning', 'known');

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
CREATE TABLE "Chat" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'group',
    "ownerId" TEXT NOT NULL,
    "apiKeyEnc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMember" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'accepted',
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "personaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "memberId" TEXT,
    "senderUserId" TEXT,
    "senderName" TEXT NOT NULL,
    "senderKind" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "english" TEXT,
    "tokens" TEXT,
    "correction" TEXT,
    "userCorrection" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "UserKanji" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kanjiId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 0,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "timesReviewed" INTEGER NOT NULL DEFAULT 0,
    "nextReview" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReviewedAt" TIMESTAMP(3),
    "mnemonic" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserKanji_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "Word" (
    "id" INTEGER NOT NULL,
    "dictionary" TEXT NOT NULL,
    "reading" TEXT NOT NULL,
    "meanings" TEXT NOT NULL,
    "partOfSpeech" "PartOfSpeech" NOT NULL,
    "verbType" "VerbType",
    "adjectiveType" "AdjectiveType",
    "jlptLevel" TEXT,
    "frequency" INTEGER,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Word_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordForm" (
    "id" TEXT NOT NULL,
    "wordId" INTEGER NOT NULL,
    "form" TEXT NOT NULL,
    "reading" TEXT NOT NULL,
    "formType" TEXT NOT NULL,
    "generated" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "WordForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFlashcard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wordId" INTEGER,
    "phraseId" TEXT,
    "wordFormId" TEXT,
    "status" "FlashcardStatus" NOT NULL DEFAULT 'new',
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 0,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "timesReviewed" INTEGER NOT NULL DEFAULT 0,
    "exposures" INTEGER NOT NULL DEFAULT 0,
    "nextReview" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReviewedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFlashcard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Phrase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "reading" TEXT NOT NULL,
    "meanings" TEXT NOT NULL,
    "partOfSpeech" "PartOfSpeech" NOT NULL DEFAULT 'phrase',
    "source" TEXT NOT NULL DEFAULT 'ai_chat',
    "sourceId" TEXT,
    "context" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Phrase_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "Chat_ownerId_idx" ON "Chat"("ownerId");

-- CreateIndex
CREATE INDEX "ChatMember_chatId_idx" ON "ChatMember"("chatId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatMember_chatId_userId_key" ON "ChatMember"("chatId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatMember_chatId_personaId_key" ON "ChatMember"("chatId", "personaId");

-- CreateIndex
CREATE INDEX "Message_chatId_createdAt_idx" ON "Message"("chatId", "createdAt");

-- CreateIndex
CREATE INDEX "Memory_userId_category_idx" ON "Memory"("userId", "category");

-- CreateIndex
CREATE INDEX "Memory_userId_personaId_idx" ON "Memory"("userId", "personaId");

-- CreateIndex
CREATE INDEX "UserKanji_userId_status_idx" ON "UserKanji"("userId", "status");

-- CreateIndex
CREATE INDEX "UserKanji_userId_nextReview_idx" ON "UserKanji"("userId", "nextReview");

-- CreateIndex
CREATE UNIQUE INDEX "UserKanji_userId_kanjiId_key" ON "UserKanji"("userId", "kanjiId");

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

-- CreateIndex
CREATE UNIQUE INDEX "Word_dictionary_key" ON "Word"("dictionary");

-- CreateIndex
CREATE INDEX "Word_dictionary_idx" ON "Word"("dictionary");

-- CreateIndex
CREATE INDEX "Word_reading_idx" ON "Word"("reading");

-- CreateIndex
CREATE INDEX "Word_jlptLevel_frequency_idx" ON "Word"("jlptLevel", "frequency");

-- CreateIndex
CREATE INDEX "Word_partOfSpeech_idx" ON "Word"("partOfSpeech");

-- CreateIndex
CREATE INDEX "Word_frequency_idx" ON "Word"("frequency");

-- CreateIndex
CREATE INDEX "WordForm_form_idx" ON "WordForm"("form");

-- CreateIndex
CREATE INDEX "WordForm_reading_idx" ON "WordForm"("reading");

-- CreateIndex
CREATE INDEX "WordForm_wordId_idx" ON "WordForm"("wordId");

-- CreateIndex
CREATE INDEX "WordForm_formType_idx" ON "WordForm"("formType");

-- CreateIndex
CREATE UNIQUE INDEX "WordForm_wordId_formType_key" ON "WordForm"("wordId", "formType");

-- CreateIndex
CREATE INDEX "UserFlashcard_userId_status_idx" ON "UserFlashcard"("userId", "status");

-- CreateIndex
CREATE INDEX "UserFlashcard_userId_nextReview_idx" ON "UserFlashcard"("userId", "nextReview");

-- CreateIndex
CREATE INDEX "UserFlashcard_wordId_idx" ON "UserFlashcard"("wordId");

-- CreateIndex
CREATE INDEX "UserFlashcard_phraseId_idx" ON "UserFlashcard"("phraseId");

-- CreateIndex
CREATE UNIQUE INDEX "UserFlashcard_userId_wordFormId_key" ON "UserFlashcard"("userId", "wordFormId");

-- CreateIndex
CREATE UNIQUE INDEX "UserFlashcard_userId_phraseId_key" ON "UserFlashcard"("userId", "phraseId");

-- CreateIndex
CREATE INDEX "Phrase_userId_idx" ON "Phrase"("userId");

-- CreateIndex
CREATE INDEX "Phrase_text_idx" ON "Phrase"("text");

-- CreateIndex
CREATE INDEX "Phrase_userId_verified_idx" ON "Phrase"("userId", "verified");

-- CreateIndex
CREATE UNIQUE INDEX "Phrase_userId_text_key" ON "Phrase"("userId", "text");

-- AddForeignKey
ALTER TABLE "Persona" ADD CONSTRAINT "Persona_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_addresseeId_fkey" FOREIGN KEY ("addresseeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMember" ADD CONSTRAINT "ChatMember_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMember" ADD CONSTRAINT "ChatMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMember" ADD CONSTRAINT "ChatMember_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "ChatMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserKanji" ADD CONSTRAINT "UserKanji_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserKanji" ADD CONSTRAINT "UserKanji_kanjiId_fkey" FOREIGN KEY ("kanjiId") REFERENCES "Kanji"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanjiMnemonic" ADD CONSTRAINT "KanjiMnemonic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanjiMnemonic" ADD CONSTRAINT "KanjiMnemonic_kanjiId_fkey" FOREIGN KEY ("kanjiId") REFERENCES "Kanji"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordForm" ADD CONSTRAINT "WordForm_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFlashcard" ADD CONSTRAINT "UserFlashcard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFlashcard" ADD CONSTRAINT "UserFlashcard_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFlashcard" ADD CONSTRAINT "UserFlashcard_phraseId_fkey" FOREIGN KEY ("phraseId") REFERENCES "Phrase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFlashcard" ADD CONSTRAINT "UserFlashcard_wordFormId_fkey" FOREIGN KEY ("wordFormId") REFERENCES "WordForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Phrase" ADD CONSTRAINT "Phrase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

