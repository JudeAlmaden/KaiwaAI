-- Per-user conjugation pattern mastery for Sentence Forge.
CREATE TABLE "ConjugationMastery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "lastResult" BOOLEAN,
    "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConjugationMastery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConjugationMastery_userId_pattern_key" ON "ConjugationMastery"("userId", "pattern");
CREATE INDEX "ConjugationMastery_userId_dueAt_idx" ON "ConjugationMastery"("userId", "dueAt");

ALTER TABLE "ConjugationMastery"
    ADD CONSTRAINT "ConjugationMastery_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
