/**
 * Restore flashcards from backup JSON to the new UserFlashcard system.
 * 
 * This script:
 * 1. Reads the backup JSON file
 * 2. For each old flashcard, finds the matching Word in the CSV-imported dictionary
 * 3. Creates a UserFlashcard with preserved SRS data
 * 
 * Usage: npx tsx scripts/restore-flashcards.ts
 */

// IMPORTANT: Load environment variables FIRST before any imports
import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import * as fs from "fs";
import * as path from "path";

interface OldFlashcard {
  word: string;
  reading: string;
  romaji: string;
  meaning: string;
  partOfSpeech: string;
  jlptTier: string;
  status: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  timesReviewed: number;
  exposures: number;
  nextReview: string;
  lastReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BackupData {
  user: {
    email: string;
    name: string;
  };
  flashcards: OldFlashcard[];
}

async function restoreFlashcards() {
  // Find the backup file
  const backupFiles = fs.readdirSync(process.cwd()).filter(f => f.startsWith('flashcard-backup-') && f.endsWith('.json'));
  
  if (backupFiles.length === 0) {
    console.error("❌ No backup file found. Looking for files matching 'flashcard-backup-*.json'");
    process.exit(1);
  }
  
  const backupPath = path.join(process.cwd(), backupFiles[0]);
  console.log(`📖 Reading backup file: ${backupFiles[0]}...`);
  
  const backupData: BackupData = JSON.parse(
    fs.readFileSync(backupPath, "utf-8")
  );

  console.log(`Found ${backupData.flashcards.length} flashcards to restore`);
  console.log(`User: ${backupData.user.name} (${backupData.user.email})\n`);

  // Find the user by email
  const user = await prisma.user.findUnique({
    where: { email: backupData.user.email },
  });

  if (!user) {
    console.error(`❌ User not found: ${backupData.user.email}`);
    console.log("Please create the user account first.");
    process.exit(1);
  }

  console.log(`✓ Found user: ${user.name || user.email}\n`);

  let restored = 0;
  let notFound = 0;
  let alreadyExists = 0;
  let errors = 0;

  const notFoundWords: string[] = [];

  for (const oldCard of backupData.flashcards) {
    try {
      // Find the word in the new Word table
      // Match by dictionary form (the word itself) or reading
      const word = await prisma.word.findFirst({
        where: {
          OR: [
            { dictionary: oldCard.word },
            { reading: oldCard.reading },
            // Also try without whitespace/formatting differences
            { dictionary: oldCard.word.trim() },
            { reading: oldCard.reading.trim() },
          ],
        },
      });

      if (!word) {
        notFound++;
        notFoundWords.push(`${oldCard.word} (${oldCard.reading})`);
        console.log(`⚠️  Word not found in dictionary: ${oldCard.word} (${oldCard.reading})`);
        continue;
      }

      // Check if user already has this flashcard
      const existing = await prisma.userFlashcard.findFirst({
        where: {
          userId: user.id,
          wordId: word.id,
          wordFormId: null, // Base word, not a conjugation
        },
      });

      if (existing) {
        alreadyExists++;
        console.log(`⏭️  Already exists: ${oldCard.word}`);
        continue;
      }

      // Map old status to new enum
      let status: "new" | "learning" | "known" = "new";
      if (oldCard.status === "learning") status = "learning";
      else if (oldCard.status === "known") status = "known";

      // Create the UserFlashcard with preserved SRS data
      // Note: We DON'T store meanings - they come from the Word table now!
      await prisma.userFlashcard.create({
        data: {
          userId: user.id,
          wordId: word.id,
          wordFormId: null, // Studying the base word
          phraseId: null,   // Not a phrase
          status,
          easeFactor: oldCard.easeFactor,
          interval: oldCard.interval,
          repetitions: oldCard.repetitions,
          timesReviewed: oldCard.timesReviewed,
          exposures: oldCard.exposures,
          nextReview: new Date(oldCard.nextReview),
          lastReviewedAt: oldCard.lastReviewedAt
            ? new Date(oldCard.lastReviewedAt)
            : null,
          createdAt: new Date(oldCard.createdAt),
        },
      });

      restored++;
      console.log(`✓ Restored: ${oldCard.word} (${oldCard.reading}) - ${status}`);
      console.log(`  → Matched to Word ID ${word.id}: ${word.dictionary} (${word.reading})`);
    } catch (error) {
      errors++;
      console.error(`❌ Error processing ${oldCard.word}:`, error);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 Restoration Summary");
  console.log("=".repeat(60));
  console.log(`✅ Successfully restored: ${restored}`);
  console.log(`⏭️  Already existed: ${alreadyExists}`);
  console.log(`⚠️  Words not found in dictionary: ${notFound}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📝 Total processed: ${backupData.flashcards.length}`);

  if (notFoundWords.length > 0) {
    console.log("\n" + "=".repeat(60));
    console.log("⚠️  Words not found in dictionary:");
    console.log("=".repeat(60));
    notFoundWords.forEach((word) => console.log(`   - ${word}`));
    console.log("\nThese words may need to be manually added or imported.");
  }
}

restoreFlashcards()
  .then(() => {
    console.log("\n✨ Restoration complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  });
