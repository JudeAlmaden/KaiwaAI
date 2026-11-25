/**
 * Grammar mastery: per-concept records, spacing and difficulty targets.
 *
 * Mastery is tracked per concept (particles, adjectives, verb groups …) and is
 * deliberately separate from vocabulary SRS and from conjugation patterns.
 * Levels and difficulty are derived from attempts/correct/streak; nothing
 * stores a level, so practice always reflects real answers.
 */

export type ConceptStats = {
  concept: string;
  attempts: number;
  correct: number;
  streak: number;
  dueAt?: string | Date | null;
  /** When the concept was last answered, for the mastery panel. */
  lastPracticed?: string | Date | null;
};

export function accuracyOf(
  stats?: Pick<ConceptStats, "attempts" | "correct"> | null
): number {
  if (!stats || stats.attempts <= 0) return 0;
  return stats.correct / stats.attempts;
}

/** 0–1 estimate of how well a concept is known, from accuracy, volume and streak. */
export function masteryScore(stats?: ConceptStats | null): number {
  if (!stats || stats.attempts === 0) return 0;
  const volume = Math.min(1, stats.attempts / 8);
  const consistency = Math.min(1, stats.streak / 3);
  return accuracyOf(stats) * 0.7 + volume * 0.2 + consistency * 0.1;
}

/** Difficulty (1–5) worth aiming at right now; drifts up as mastery grows. */
export function targetDifficulty(stats?: ConceptStats | null): number {
  return 1 + masteryScore(stats) * 4;
}

/**
 * Cost of an exercise's difficulty against the learner's current level.
 * A band of ±1 keeps a mix around the target: strong learners still see an
 * easier item now and then, and shaky concepts still get a harder stretch.
 * Lower is better.
 */
export function difficultyFit(stage: 1 | 2 | 3 | 4 | 5, stats?: ConceptStats | null): number {
  const distance = Math.abs(stage - targetDifficulty(stats));
  return Math.max(0, distance - 1) * 0.14;
}

/** Correct answers space out; misses return within the same sitting. */
const MINUTE_STEPS = [10, 240, 1440, 4320, 10080];

export function nextDueAt(correct: boolean, streak: number, now: Date = new Date()): Date {
  if (!correct) return new Date(now.getTime() + 60_000);
  const step =
    MINUTE_STEPS[Math.min(Math.max(streak, 1), MINUTE_STEPS.length) - 1] ?? 10;
  return new Date(now.getTime() + step * 60_000);
}

export type AttemptResult = {
  attempts: number;
  correct: number;
  streak: number;
  dueAt: Date;
};

export function applyAttempt(
  stats: Pick<ConceptStats, "attempts" | "correct" | "streak"> | null | undefined,
  correct: boolean,
  now: Date = new Date()
): AttemptResult {
  const attempts = (stats?.attempts ?? 0) + 1;
  const correctCount = (stats?.correct ?? 0) + (correct ? 1 : 0);
  const streak = correct ? (stats?.streak ?? 0) + 1 : 0;
  return { attempts, correct: correctCount, streak, dueAt: nextDueAt(correct, streak, now) };
}

/**
 * Lower means "practise this sooner": low accuracy first, then concepts that
 * are due (overdue pulls a concept forward, not-yet-due holds it back a little).
 */
export function practiceWeight(
  stats?: ConceptStats | null,
  now: Date = new Date()
): number {
  if (!stats || stats.attempts === 0) return 0.45;
  const hoursUntilDue = stats.dueAt
    ? (new Date(stats.dueAt).getTime() - now.getTime()) / 3_600_000
    : 0;
  const due = Math.min(1, Math.max(-1, hoursUntilDue / 24));
  return accuracyOf(stats) + due * 0.2;
}
