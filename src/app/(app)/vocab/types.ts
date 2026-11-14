export type Card = {
  id: string;
  word: string;
  reading: string;
  romaji?: string;
  meaning: string;
  partOfSpeech: string;
  status: "new" | "learning" | "known";
  repetitions: number;
  interval: number;
  nextReview: string;
  isPhrase: boolean;
  formType?: string | null;
  wordId?: number | null;
  dictionary?: string | null;
  note?: string | null; // User's custom note
};

export type WordForm = {
  id: string;
  form: string;
  reading: string;
  formType: string;
  saved: boolean;
};

export const FILTERS = ["All", "Learning", "Known"] as const;
export type Filter = (typeof FILTERS)[number];

export type SortBy = "Default" | "Mastery ↑" | "Mastery ↓";
export const SORT_OPTIONS: SortBy[] = ["Default", "Mastery ↑", "Mastery ↓"];

export type ContentTab = "words" | "phrases" | "conjugation";

/** Same weighting the list ring and the detail sheet both show. */
export function progressOf(c: Card): number {
  const rep = Math.min(c.repetitions / 3, 1);
  const intv = Math.min(c.interval / 21, 1);
  return Math.round(((rep + intv) / 2) * 100);
}
