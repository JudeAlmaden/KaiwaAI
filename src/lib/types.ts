// Shared domain types. SQLite stores these as plain strings; validate in code.

export type MessageRole = "kai" | "user";

export type CardStatus = "new" | "learning" | "known";

export type PartOfSpeech =
  | "verb"
  | "adjective"
  | "noun"
  | "particle"
  | "adverb"
  | "pronoun"
  | "expression"
  | "other";

export type MemoryCategory =
  | "profile"
  | "preference"
  | "fact"
  | "goal"
  | "relationship";

/** One word in Kai's reply, produced by Gemini structured output. */
export type CachedToken = {
  surface: string; // text as it appears (may be conjugated)
  reading: string; // hiragana/katakana
  romaji: string;
  meaning: string; // context-appropriate English
  pos: PartOfSpeech;
  dictForm: string; // dictionary/lemma form — the Flashcard `word`
};

/** Full structured response Kai returns each turn. */
export type KaiResponse = {
  reply: string;
  english: string; // natural English translation of the reply
  tokens: CachedToken[];
  newWords: string[]; // dictForms deliberately introduced this turn
  usedModel?: string; // which model actually answered (after any fallback)
};

export const MAX_MESSAGE_CHARS = 200;

/** Code-point length (kanji/emoji count as 1). */
export function charLength(s: string): number {
  return [...s].length;
}

const LEXICAL_POS: PartOfSpeech[] = [
  "verb",
  "adjective",
  "noun",
  "adverb",
  "expression",
];

/** Whether a token is worth saving as a flashcard (skip particles/pronouns). */
export function isLexical(pos: PartOfSpeech): boolean {
  return LEXICAL_POS.includes(pos);
}
