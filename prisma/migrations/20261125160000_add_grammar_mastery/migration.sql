-- Per-user grammar concept mastery for Sentence Construction.
CREATE TABLE "GrammarMastery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "lastResult" BOOLEAN,
    "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrammarMastery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GrammarMastery_userId_concept_key" ON "GrammarMastery"("userId", "concept");
CREATE INDEX "GrammarMastery_userId_dueAt_idx" ON "GrammarMastery"("userId", "dueAt");

ALTER TABLE "GrammarMastery"
    ADD CONSTRAINT "GrammarMastery_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
