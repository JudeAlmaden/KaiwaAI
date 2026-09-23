/**
 * Card progress calculation — returns a 0..1 mastery value.
 *
 * FSRS path (preferred, when D + S are set):
 *   progress = 0.7 · stability_score + 0.3 · difficulty_score
 *     stability_score = clamp(S / 90, 0, 1)
 *     difficulty_score = clamp((10 − D) / 9, 0, 1)
 *
 * SM-2 fallback (legacy, when FSRS fields are null):
 *   progress = (clamp(repetitions / 3, 0, 1) + clamp(interval / 21, 0, 1)) / 2
 *
 * Validates: Requirements 9.1–9.6 (bounds, high/low thresholds, dual-input, fallback)
 */

import { progress as sm2Progress } from "@/lib/srs";

export interface FsrsProgressInput {
  difficulty?: number | null;
  stability?: number | null;
}

export interface Sm2ProgressInput {
  easeFactor: number;
  interval: number;
  repetitions: number;
}

export function calculateCardProgress(
  input: FsrsProgressInput & Partial<Sm2ProgressInput>
): number {
  const hasFsrs =
    input.difficulty != null &&
    input.stability != null &&
    !isNaN(input.difficulty) &&
    !isNaN(input.stability);

  if (hasFsrs) {
    const D = Math.max(1, Math.min(10, input.difficulty!));
    const S = Math.max(0, input.stability!);

    // Stability component — longer intervals → higher progress.
    // At 90 days → 1.0; at 3 days → ~0.033.
    const stabilityScore = Math.max(0, Math.min(1, S / 90));

    // Difficulty component — easier cards (lower D) → higher progress.
    // At D=1 → 1.0; at D=10 → 0.0.
    const difficultyScore = Math.max(0, Math.min(1, (10 - D) / 9));

    // Weighted: stability is the primary driver of "mastery", difficulty is secondary.
    const combined = 0.7 * stabilityScore + 0.3 * difficultyScore;
    return Math.round(combined * 100) / 100;
  }

  // SM-2 fallback when FSRS fields are missing.
  if (
    typeof input.easeFactor === "number" &&
    typeof input.interval === "number" &&
    typeof input.repetitions === "number"
  ) {
    return sm2Progress({
      easeFactor: input.easeFactor,
      interval: input.interval,
      repetitions: input.repetitions,
    });
  }

  // No usable input → 0 progress.
  return 0;
}
