/**
 * Migrate existing AI-generated Words to the new Phrase table.
 * 
 * This script:
 * 1. Finds all Words with aiGenerated = true
 * 2. For each AI word, finds all users who have flashcards for it
 * 3. Creates a Phrase for each user
 * 4. Updates UserFlashcards to point to the new Phrase
 * 5. Deletes the AI-generated Word (cascades to WordForms)
 * 
 * Usage: npm run migrate:phrases
 */

// IMPORTANT: Load environment variables FIRST before any imports
import "dotenv/config";

import { prisma } from "../src/lib/prisma";

async function migrateToPhraes() {
  console.log("🔄 Starting migration of AI-generated words to phrases...\n");

  // Find all AI-generated words
  const aiWords = await prisma.word.findMany({
    where: { aiGenerated: true },
    include: {
      userFlashcards: {
        include: {
          user: true,
        },
      },
    },
  });

  console.log(`Found ${aiWords.length} AI-generated words\n`);

  if (aiWords.length === 0) {
    console.log("✓ No AI-generated words to migrate!");
    return;
  }

  let phrasesCreated = 0;
  let flashcardsUpdated = 0;
  let wordsDeleted = 0;
  const errors: string[] = [];

  for (const word of aiWords) {
    try {
      console.log(`\n📝 Processing: ${word.dictionary} (${word.reading})`);
      console.log(`   Affects ${word.userFlashcards.length} flashcard(s)`);

      // Get unique users who have flashcards for this word
      const userIds = [...new Set(word.userFlashcards.map((uf) => uf.userId))];

      for (const userId of userIds) {
        // Check if phrase already exists for this user
        const existingPhrase = await prisma.phrase.findUnique({
          where: {
            userId_text: {
              userId,
              text: word.dictionary,
            },
          },
        });

        let phrase;
        if (existingPhrase) {
          phrase = existingPhrase;
          console.log(`   ⏭️  Phrase already exists for user ${userId}`);
        } else {
          // Create a Phrase for this user
          phrase = await prisma.phrase.create({
            data: {
              userId,
              text: word.dictionary,
              reading: word.reading,
              meanings: word.meanings,
              partOfSpeech: word.partOfSpeech,
              source: "ai_lookup", // Since we don't have context, mark as lookup
              verified: false,
              reviewed: false,
            },
          });
          phrasesCreated++;
          console.log(`   ✓ Created phrase for user ${userId}`);
        }

        // Update all flashcards for this user to point to the phrase
        const userFlashcards = word.userFlashcards.filter(
          (uf) => uf.userId === userId
        );

        for (const flashcard of userFlashcards) {
          await prisma.userFlashcard.update({
            where: { id: flashcard.id },
            data: {
              wordId: null,
              wordFormId: null, // Phrases don't have forms
              phraseId: phrase.id,
            },
          });
          flashcardsUpdated++;
          console.log(`   ✓ Updated flashcard ${flashcard.id}`);
        }
      }

      // Delete the AI-generated word (will cascade to WordForms)
      await prisma.word.delete({
        where: { id: word.id },
      });
      wordsDeleted++;
      console.log(`   🗑️  Deleted AI word: ${word.dictionary}`);
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      errors.push(`${word.dictionary}: ${err}`);
      console.error(`   ❌ Error: ${err}`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 Migration Summary");
  console.log("=".repeat(60));
  console.log(`✅ Phrases created: ${phrasesCreated}`);
  console.log(`✅ Flashcards updated: ${flashcardsUpdated}`);
  console.log(`✅ AI words deleted: ${wordsDeleted}`);
  console.log(`❌ Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log("\n" + "=".repeat(60));
    console.log("❌ Errors:");
    console.log("=".repeat(60));
    errors.forEach((err) => console.log(`   - ${err}`));
  }

  console.log("\n✨ Migration complete!");
}

migrateToPhraes()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  });
