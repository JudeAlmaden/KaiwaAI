ALTER TABLE "ConjugationMastery"
  ADD COLUMN "recognitionAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "recognitionCorrect" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "constructionAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "constructionCorrect" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "applicationAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "applicationCorrect" INTEGER NOT NULL DEFAULT 0;
