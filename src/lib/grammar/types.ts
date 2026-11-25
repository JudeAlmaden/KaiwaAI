/**
 * Sentence Construction exercise model.
 *
 * Exercises are plain data; presentation and checking live elsewhere, so new
 * grammar points or exercise types can be added without touching the page.
 */

export type ExerciseStage = 1 | 2 | 3 | 4 | 5;

export type GrammarHighlight = { token: string; note: string };

/** How the answer is derived, shown after answering a conjugation exercise. */
export type ConjugationNote = {
  /** Name of the target form, e.g. "Negative non-past". */
  form: string;
  /** Ordered derivation, e.g. ["Godan: す → さ", "Add ない"]. */
  steps: string[];
  /** Parallel verbs in the same form. */
  examples?: { ja: string; note?: string }[];
};

type GrammarExerciseBase = {
  id: string;
  /** Concept id from curriculum.ts. */
  concept: string;
  /** Difficulty 1–5: recognise · guided build · complete · transform · produce. */
  stage: ExerciseStage;
  /** English meaning, shown with the prompt and in feedback. Transformations carry `fromEn` instead. */
  en?: string;
  /** Canonical Japanese answer. */
  ja: string;
  /** Other natural full sentences that also count. */
  alternatives?: string[];
  /** Dictionary forms this exercise uses, for deck matching. */
  words?: string[];
  /** Optional nudge shown on request, before answering. Never the answer itself. */
  hint?: string;
  /** One concise grammar note shown after answering. */
  rule: string;
  /** Derivation shown with feedback for conjugation exercises. */
  conjugation?: ConjugationNote;
  /** Short structure breakdown, e.g. ["topic は", "object を", "verb"]. */
  structure?: string[];
  /** Particles/conjugations worth pointing at. */
  highlights?: GrammarHighlight[];
  /** Curated wrong answers with a diagnosis. */
  nearMisses?: { answer: string; note: string }[];
  /** Built from the learner's deck at runtime, not from the curated bank. */
  generated?: boolean;
};

export type AssemblyExercise = GrammarExerciseBase & {
  kind: "assemble";
  /** Selectable tiles, including at least one distractor. */
  tiles: string[];
  /** The tiles of the correct sentence, in order. */
  solution: string[];
  /** Other natural tile orders that also count. */
  alternativeOrders?: string[][];
};

export type ParticleExercise = GrammarExerciseBase & {
  kind: "particle";
  /** Japanese text before the blank. */
  before: string;
  /** Japanese text after the blank (starts with the predicate). */
  after: string;
  answer: string;
  options: string[];
  /** Why each wrong particle does not fit here. */
  whyWrong?: Record<string, string>;
};

export type CompletionExercise = GrammarExerciseBase & {
  kind: "complete";
  before: string;
  after: string;
  answer: string;
  /** Alternative spellings, e.g. kanji and kana. */
  accepted?: string[];
  /** Multiple-choice completion; omitted = typed. */
  options?: string[];
};

export type TransformationExercise = GrammarExerciseBase & {
  kind: "transform";
  /** The sentence the learner starts from. */
  from: string;
  /** English meaning of the starting sentence. */
  fromEn: string;
  /** What to change it into, e.g. "Negative (polite)". */
  target: string;
  answer: string;
  accepted?: string[];
};

export type ProductionExercise = GrammarExerciseBase & {
  kind: "produce";
  prompt: string;
  accepted: string[];
};

export type GrammarExercise =
  | AssemblyExercise
  | ParticleExercise
  | CompletionExercise
  | TransformationExercise
  | ProductionExercise;

export type GrammarResponse = string | string[];

export type CheckResult = {
  correct: boolean;
  /** Canonical answer to show after checking. */
  expected: string;
  /** Specific diagnosis of a wrong answer, when we can name it. */
  mistake: string | null;
};
