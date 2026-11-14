import type { CardSourceContext } from "@/lib/review/card-source";

export type Card = {
  id: string;
  type?: "vocabulary" | "kanji";
  word?: string;
  reading?: string;
  romaji?: string;
  meaning?: string;
  partOfSpeech?: string;
  formType?: string | null;
  dictionary?: string | null;
  note?: string | null;
  character?: string;
  meanings?: string[];
  readingsOn?: string[];
  readingsKun?: string[];
  radicals?: string[];
  heisigNumber?: number | null;
  heisigKeyword?: string | null;
  heisigLesson?: number | null;
  customMeaning?: string | null;
  primitives?: string[];
  mnemonic?: string;
  status?: "new" | "learning" | "known";
  /** The chat exchange the card was first saved from. */
  sourceContext?: CardSourceContext | null;
  /** SRS counters — drive the leech badge. */
  timesReviewed?: number;
  interval?: number;
  repetitions?: number;
  _pool?: "active" | "maintenance";
};
