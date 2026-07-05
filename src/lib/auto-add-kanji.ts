import "server-only";
import { prisma } from "./prisma";

/**
 * Extract kanji characters from a word and automatically add them to the user's
 * review queue if they're not already there. This is called when a user adds a
 * vocabulary word to their flashcards.
 */
export async function autoAddKanjiFromWord(userId: string, word: string): Promise<void> {
  // Extract kanji characters (Unicode range for CJK Unified Ideographs)
  const kanjiChars = Array.from(word).filter((char) => {
    const code = char.charCodeAt(0);
    return (
      (code >= 0x4e00 && code <= 0x9faf) || // CJK Unified Ideographs
      (code >= 0x3400 && code <= 0x4dbf) || // CJK Extension A
      (code >= 0x20000 && code <= 0x2a6df) // CJK Extension B
    );
  });

  if (kanjiChars.length === 0) return;

  // Get unique kanji
  const uniqueKanji = Array.from(new Set(kanjiChars));

  // Find which kanji exist in our database
  const existingKanji = await prisma.kanji.findMany({
    where: { character: { in: uniqueKanji } },
    select: { id: true, character: true },
  });

  if (existingKanji.length === 0) return;

  // Check which ones the user already has in their review queue
  const existingUserKanji = await prisma.userKanji.findMany({
    where: {
      userId,
      kanjiId: { in: existingKanji.map((k) => k.id) },
    },
    select: { kanjiId: true },
  });

  const existingKanjiIds = new Set(existingUserKanji.map((uk) => uk.kanjiId));

  // Add the ones they don't have yet
  const toAdd = existingKanji.filter((k) => !existingKanjiIds.has(k.id));

  if (toAdd.length === 0) return;

  // Batch insert
  await prisma.userKanji.createMany({
    data: toAdd.map((k) => ({
      userId,
      kanjiId: k.id,
      status: "new",
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      timesReviewed: 0,
      nextReview: new Date(), // Due immediately
    })),
    skipDuplicates: true, // Safety check
  });
}
