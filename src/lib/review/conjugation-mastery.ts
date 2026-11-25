/**
 * Conjugation mastery: stage progression and light spaced repetition per
 * pattern. Pure functions so the API, the page and the tests share one source
 * of truth. Nothing here stores progress — rows live in ConjugationMastery.
 */

export type PracticeStage = 1 | 2 | 3 | 4;

export type PatternDimension = "recognition" | "construction" | "application";

export const DIMENSION_LABELS: Record<PatternDimension, string> = {
  recognition: "Recognition",
  construction: "Construction",
  application: "Application",
};

export type PatternStats = {
  pattern: string;
  attempts: number;
  correct: number;
  streak: number;
  dueAt?: Date | string | null;
  recognitionAttempts?: number;
  recognitionCorrect?: number;
  constructionAttempts?: number;
  constructionCorrect?: number;
  applicationAttempts?: number;
  applicationCorrect?: number;
};

export type DimensionCounts = {
  recognitionAttempts: number;
  recognitionCorrect: number;
  constructionAttempts: number;
  constructionCorrect: number;
  applicationAttempts: number;
  applicationCorrect: number;
};

export const STAGE_NAMES: Record<PracticeStage, string> = {
  1: "Recognition",
  2: "Understanding",
  3: "Transformation",
  4: "Application",
};

export function accuracyOf(stats: Pick<PatternStats, "attempts" | "correct">): number {
  if (stats.attempts <= 0) return 0;
  return stats.correct / stats.attempts;
}

/**
 * Stage comes from evidence, not from a stored counter:
 * 1–1 attempts: recognition, 2–3: understanding, 4–5: transformation,
 * then application once accuracy and a short streak hold up.
 */
export function stageFor(stats?: PatternStats | null): PracticeStage {
  if (!stats || stats.attempts === 0) return 1;
  if (stats.attempts < 2) return 1;
  if (stats.attempts < 4) return 2;
  const accuracy = accuracyOf(stats);
  if (stats.attempts < 6 || accuracy < 0.7 || stats.streak < 2) return 3;
  return 4;
}

/** Recognition is stages 1–2, construction is stage 3, application is stage 4. */
export function dimensionForStage(stage: PracticeStage): PatternDimension {
  if (stage <= 2) return "recognition";
  if (stage === 3) return "construction";
  return "application";
}

function dimensionAttempts(stats: PatternStats, dimension: PatternDimension): number {
  if (dimension === "recognition") return stats.recognitionAttempts ?? 0;
  if (dimension === "construction") return stats.constructionAttempts ?? 0;
  return stats.applicationAttempts ?? 0;
}

function dimensionCorrect(stats: PatternStats, dimension: PatternDimension): number {
  if (dimension === "recognition") return stats.recognitionCorrect ?? 0;
  if (dimension === "construction") return stats.constructionCorrect ?? 0;
  return stats.applicationCorrect ?? 0;
}

/** Accuracy for one dimension, or null until that dimension has an attempt. */
export function dimensionAccuracy(
  stats: PatternStats | null | undefined,
  dimension: PatternDimension
): number | null {
  if (!stats) return null;
  const attempts = dimensionAttempts(stats, dimension);
  if (attempts <= 0) return null;
  return dimensionCorrect(stats, dimension) / attempts;
}

/** Accuracy in the dimension the learner is currently practising. */
export function stageAccuracy(stats?: PatternStats | null): number | null {
  if (!stats) return null;
  return dimensionAccuracy(stats, dimensionForStage(stageFor(stats)));
}

/** Counts after one answer in a dimension, keeping the other dimensions intact. */
export function withDimensionAttempt(
  stats: PatternStats | null | undefined,
  dimension: PatternDimension,
  correct: boolean
): DimensionCounts {
  const counts: DimensionCounts = {
    recognitionAttempts: stats?.recognitionAttempts ?? 0,
    recognitionCorrect: stats?.recognitionCorrect ?? 0,
    constructionAttempts: stats?.constructionAttempts ?? 0,
    constructionCorrect: stats?.constructionCorrect ?? 0,
    applicationAttempts: stats?.applicationAttempts ?? 0,
    applicationCorrect: stats?.applicationCorrect ?? 0,
  };
  if (dimension === "recognition") {
    counts.recognitionAttempts += 1;
    if (correct) counts.recognitionCorrect += 1;
  } else if (dimension === "construction") {
    counts.constructionAttempts += 1;
    if (correct) counts.constructionCorrect += 1;
  } else {
    counts.applicationAttempts += 1;
    if (correct) counts.applicationCorrect += 1;
  }
  return counts;
}

/** Choices stay available while a pattern is still shaky. */
export function usesChoices(stage: PracticeStage, stats?: PatternStats | null): boolean {
  if (stage <= 2) return true;
  if (!stats || stats.attempts < 4) return true;
  return accuracyOf(stats) < 0.6;
}

/** Correct answers space out; misses come back within the same session. */
const MINUTE_STEPS = [1, 30, 240, 1440, 4320];

export function nextDueAt(correct: boolean, streak: number, now: Date = new Date()): Date {
  if (!correct) return new Date(now.getTime() + 60_000);
  const step = MINUTE_STEPS[Math.min(Math.max(streak, 1), MINUTE_STEPS.length) - 1] ?? 60;
  return new Date(now.getTime() + step * 60_000);
}

export type AttemptResult = {
  attempts: number;
  correct: number;
  streak: number;
  dueAt: Date;
};

export function applyAttempt(
  stats: Pick<PatternStats, "attempts" | "correct" | "streak"> | null | undefined,
  correct: boolean,
  now: Date = new Date()
): AttemptResult {
  const attempts = (stats?.attempts ?? 0) + 1;
  const correctCount = (stats?.correct ?? 0) + (correct ? 1 : 0);
  const streak = correct ? (stats?.streak ?? 0) + 1 : 0;
  return { attempts, correct: correctCount, streak, dueAt: nextDueAt(correct, streak, now) };
}

/**
 * Weakest first. When dimension counts exist, the stage the learner is on
 * drives the weight, so a weak construction score isn't hidden by strong
 * recognition.
 */
export function practiceWeight(stats?: PatternStats | null): number {
  if (!stats || stats.attempts === 0) return 0.5;
  const accuracy = stageAccuracy(stats) ?? accuracyOf(stats);
  const overdue = stats.dueAt ? Math.min(1, Math.max(0, (Date.now() - new Date(stats.dueAt).getTime()) / 3_600_000)) : 0;
  return accuracy - overdue * 0.25;
}

export type FeedbackDepth = "brief" | "standard" | "detailed";

/**
 * Feedback volume follows performance: misses get the full rule, hint users
 * get reinforcement, and a learner on a streak gets a compact reminder.
 */
export function feedbackDepth(input: {
  correct: boolean;
  hintsUsed: number;
  stats?: PatternStats | null;
  stage: PracticeStage;
}): FeedbackDepth {
  if (!input.correct) return "detailed";
  if (input.hintsUsed > 0) return "standard";
  const stats = input.stats ?? null;
  const accuracy = dimensionAccuracy(stats, dimensionForStage(input.stage));
  if (stats && stats.streak >= 3 && (accuracy === null || accuracy >= 0.8)) return "brief";
  return "standard";
}
