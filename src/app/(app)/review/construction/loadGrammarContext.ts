import { deckWordsFrom, type DeckWord } from "@/lib/grammar/deck";
import type { ConceptStats } from "@/lib/grammar/mastery";

type MasteryRow = {
  concept: string;
  attempts: number;
  correct: number;
  streak: number;
  dueAt: string;
  updatedAt?: string;
};

type DeckCard = {
  word?: string | null;
  reading?: string | null;
  meaning?: string | null;
  dictionary?: string | null;
  partOfSpeech?: string | null;
  verbType?: string | null;
  adjectiveType?: string | null;
  forms?: Array<{ form: string; reading?: string | null; formType?: string | null }> | null;
};

export type GrammarContext = {
  stats: Record<string, ConceptStats>;
  knownWords: Set<string>;
  /** Saved vocabulary the generator can build sentences from. */
  deckWords: DeckWord[];
  /** The stream still runs without mastery; the UI just says it couldn't load. */
  masteryFailed: boolean;
};

/**
 * Loads the three things the stream needs: persisted mastery, familiar
 * vocabulary, and the words themselves so extra sentences can be generated.
 * Deck data is optional — without it the curated bank still runs.
 */
export async function loadGrammarContext(): Promise<GrammarContext> {
  const [masteryResponse, deckResponse] = await Promise.allSettled([
    fetch("/api/grammar/mastery"),
    fetch("/api/flashcards/review?studyMode=all&limit=200"),
  ]);

  const stats: Record<string, ConceptStats> = {};
  let masteryFailed = true;
  if (masteryResponse.status === "fulfilled" && masteryResponse.value.ok) {
    const data = await masteryResponse.value.json();
    for (const row of (data.mastery ?? []) as MasteryRow[]) {
      stats[row.concept] = {
        concept: row.concept,
        attempts: row.attempts,
        correct: row.correct,
        streak: row.streak,
        dueAt: row.dueAt,
        lastPracticed: row.updatedAt ?? null,
      };
    }
    masteryFailed = false;
  }

  const knownWords = new Set<string>();
  const cards: DeckCard[] = [];
  if (deckResponse.status === "fulfilled" && deckResponse.value.ok) {
    const data = await deckResponse.value.json();
    for (const card of (data.cards ?? []) as DeckCard[]) {
      cards.push(card);
      for (const value of [card.word, card.reading, card.dictionary]) {
        if (value) knownWords.add(value);
      }
      for (const form of card.forms ?? []) {
        if (form.form) knownWords.add(form.form);
        if (form.reading) knownWords.add(form.reading);
      }
    }
  }

  return { stats, knownWords, deckWords: deckWordsFrom(cards), masteryFailed };
}
