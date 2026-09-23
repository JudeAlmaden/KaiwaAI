/**
 * Card status calculation from FSRS (and fallback SM-2) state.
 *
 * Rules (applied in priority order):
 *   1. repetitions === 0 AND status === "new" on input  → "new"
 *   2. grade === 0 (lapse / failed review)                → "learning"
 *   3. stability > 21  AND  difficulty < 6               → "known"
 *   4. stability < 1   OR   repetitions === 0            → "learning"
 *   5. otherwise                                          → "learning"
 *
 * Validates: Requirements 18.1–18.5 (thresholds, FSRS-driven, SM-2 fallback,
 *           identical rules for vocabulary + kanji)
 */

import type { CardStatus } from "@/lib/types";

export interface StatusInput {
  /** FSRS stability in days */
  stability?: number | null;
  /** FSRS difficulty (1–10) */
  difficulty?: number | null;
  /** SM-2 repetitions count */
  repetitions: number;
  /** SM-2 interval in days (used only in fallback path) */
  interval?: number;
  /** Current stored status, used to preserve "new" for unstarted cards */
  currentStatus?: CardStatus | string | null;
  /** Review grade that triggered the recalc — a lapse (0) forces "learning" */
  lastGrade?: 0 | 1 | 2 | 3 | null;
}

const KNOWN_STABILITY_DAYS = 21;
const KNOWN_MAX_DIFFICULTY = 6;
const LEARNING_STABILITY_DAYS = 1;

export function calculateCardStatus(input: StatusInput): CardStatus {
  const {
    stability,
    difficulty,
    repetitions,
    currentStatus,
    lastGrade,
  } = input;

  // 1. Unstarted card preserved as "new"
  if (repetitions === 0 && currentStatus === "new") {
    return "new";
  }

  // 2. Failed review always resets to learning
  if (lastGrade === 0) {
    return "learning";
  }

  const hasFsrs =
    stability != null &&
    difficulty != null &&
    !isNaN(stability) &&
    !isNaN(difficulty);

  if (hasFsrs) {
    const S = Math.max(0, stability!);
    const D = Math.max(1, Math.min(10, difficulty!));

    // 3. Mature + easy → "known"
    if (S > KNOWN_STABILITY_DAYS && D < KNOWN_MAX_DIFFICULTY) {
      return "known";
    }

    // 4. Still fragile → "learning"
    if (S < LEARNING_STABILITY_DAYS || repetitions === 0) {
      return "learning";
    }

    return "learning";
  }

  // SM-2 fallback — replicate the legacy thresholds for consistency.
  // known: reps ≥ 3 AND interval ≥ 21
  const knownReps = 3;
  const knownInterval = KNOWN_STABILITY_DAYS;
  if (repetitions >= knownReps && (input.interval ?? 0) >= knownInterval) {
    return "known";
  }
  return "learning";
}
