import type { Mood } from "../mood";

export type PromptContext = {
  level: string;
  reinforce: string[];
  newWordBudget: number;
  knownCount: number;
  memories: string[];
  recentTurns: { role: "kai" | "user"; content: string }[];
  mood?: Mood;
  hoursSinceUserReply?: number;
  summary?: string | null;
  summaryUpToId?: string | null;
  recentCorrections?: string[];
};

export type GeminiContent = { role: string; parts: { text: string }[] };

export type QuotedMessage = { role: "kai" | "user"; content: string };

export type ProactiveKind = "opener" | "followup";

export type LookupResult = {
  word: string; // dictionary form (Japanese)
  reading: string;
  romaji: string;
  meaning: string;
  pos: string;
  example: string; // a short N5-ish example sentence in Japanese
  exampleEn: string; // its English translation
};

export type KanjiMnemonicInput = {
  character: string;
  meanings: string[];
  readingsOn: string[];
  readingsKun: string[];
};
