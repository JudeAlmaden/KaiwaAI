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

/** Grammar feedback on the user's Japanese for the current turn. */
export type CorrectionStatus = "none" | "correct" | "unnatural" | "incorrect";

export type Correction = {
  status: CorrectionStatus;
  explanation: string; // simple English; empty when nothing to say
  corrected: string; // the corrected Japanese (empty if already correct)
  romaji: string; // romaji of the corrected/natural form
  natural: string; // a more natural phrasing, if different
};

/** Whether a correction is worth surfacing to the user as a card. */
export function hasFeedback(c: Correction | null | undefined): c is Correction {
  return (
    !!c &&
    (c.status === "unnatural" || c.status === "incorrect") &&
    (c.explanation.trim() !== "" || c.corrected.trim() !== "")
  );
}

/** Coerce whatever the model returned into a well-formed Correction (or null
 *  when there's nothing to show). Defensive against missing/garbage fields. */
export function normalizeCorrection(raw: unknown): Correction | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const allowed: CorrectionStatus[] = [
    "none",
    "correct",
    "unnatural",
    "incorrect",
  ];
  const status = allowed.includes(r.status as CorrectionStatus)
    ? (r.status as CorrectionStatus)
    : "none";
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    status,
    explanation: str(r.explanation),
    corrected: str(r.corrected),
    romaji: str(r.romaji),
    natural: str(r.natural),
  };
}

/** Full structured response Kai returns each turn. */
export type KaiResponse = {
  reply: string;
  english: string; // natural English translation of the reply
  correction: Correction | null; // grammar feedback on the user's Japanese
  tokens: CachedToken[];
  newWords: string[]; // dictForms deliberately introduced this turn
  memorySuggestions: string[]; // durable facts about the user worth remembering
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
