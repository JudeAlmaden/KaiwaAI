import { prisma } from "./prisma";
import type { UserFlashcard } from "@/generated/prisma/client";
import { extractKanji } from "./kanji-utils";

/**
 * Get all unique kanji from user's vocabulary
 * @param userId - User ID
 * @returns Array of kanji characters sorted by frequency in vocabulary
 */
export async function getUserKanji(userId: string): Promise<string[]> {
  const flashcards = await prisma.userFlashcard.findMany({
    where: { userId },
    include: { word: true, phrase: true },
  });

  const kanjiCounts = new Map<string, number>();
  
  flashcards.forEach((card) => {
    const text = card.phrase?.text || card.word?.dictionary || "";
    const kanji = extractKanji(text);
    kanji.forEach((k) => {
      kanjiCounts.set(k, (kanjiCounts.get(k) || 0) + 1);
    });
  });

  // Sort by frequency (most common first)
  return Array.from(kanjiCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([kanji]) => kanji);
}

type FlashcardWithWordPhrase = UserFlashcard & {
  word: { dictionary: string; reading: string; meanings: string; partOfSpeech: string } | null;
  phrase: { text: string; reading: string; meanings: string; partOfSpeech: string } | null;
};

/**
 * Find vocabulary words containing a specific kanji
 * @param userId - User ID
 * @param kanji - Kanji character
 * @returns Array of flashcards containing the kanji
 */
export async function getVocabWithKanji(
  userId: string,
  kanji: string
): Promise<FlashcardWithWordPhrase[]> {
  const flashcards = await prisma.userFlashcard.findMany({
    where: { userId },
    include: {
      word: { select: { dictionary: true, reading: true, meanings: true, partOfSpeech: true } },
      phrase: { select: { text: true, reading: true, meanings: true, partOfSpeech: true } },
    },
    orderBy: { status: "asc" }, // Show known words first
  });

  return flashcards.filter((card) => {
    const text = card.phrase?.text || card.word?.dictionary || "";
    return text.includes(kanji);
  });
}

/**
 * Calculate mastery percentage for a kanji based on vocabulary status
 * @param userId - User ID
 * @param kanji - Kanji character
 * @returns Mastery percentage (0-100)
 */
export async function getKanjiMastery(
  userId: string,
  kanji: string
): Promise<number> {
  const vocabWords = await getVocabWithKanji(userId, kanji);
  
  if (vocabWords.length === 0) return 0;
  
  const knownCount = vocabWords.filter((w) => w.status === "known").length;
  return Math.round((knownCount / vocabWords.length) * 100);
}
