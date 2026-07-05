-- AlterTable
ALTER TABLE "GroupMessage" ADD COLUMN     "userCorrection" TEXT;

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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserKanji_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserKanji_userId_status_idx" ON "UserKanji"("userId", "status");

-- CreateIndex
CREATE INDEX "UserKanji_userId_nextReview_idx" ON "UserKanji"("userId", "nextReview");

-- CreateIndex
CREATE UNIQUE INDEX "UserKanji_userId_kanjiId_key" ON "UserKanji"("userId", "kanjiId");

-- AddForeignKey
ALTER TABLE "UserKanji" ADD CONSTRAINT "UserKanji_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserKanji" ADD CONSTRAINT "UserKanji_kanjiId_fkey" FOREIGN KEY ("kanjiId") REFERENCES "Kanji"("id") ON DELETE CASCADE ON UPDATE CASCADE;
