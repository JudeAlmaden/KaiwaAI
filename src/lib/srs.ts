import type { CardStatus } from "./types";
import {
  GRADUATED_INTERVAL_DAYS,
  GRADUATED_REPETITIONS,
  isGraduated,
} from "./review/lifecycle";

// SM-2 spaced-repetition scheduling.
// grade: 0 = Again, 1 = Hard, 2 = Good, 3 = Easy (mapped to SM-2 quality 0..5).

export type ReviewGrade = 0 | 1 | 2 | 3;

export type SrsState = {
  easeFactor: number;
  interval: number; // days
  repetitions: number;
};

export type SrsResult = SrsState & {
  status: CardStatus;
  nextReview: Date;
};

const QUALITY: Record<ReviewGrade, number> = { 0: 2, 1: 3, 2: 4, 3: 5 };

// Graduation is defined once, in review/lifecycle.ts.

export function applyReview(
  state: SrsState,
  grade: ReviewGrade,
  options?: {
    isEarly?: boolean;
    daysElapsed?: number;
  }
): SrsResult {
  const q = QUALITY[grade];
  let { easeFactor, interval, repetitions } = state;

  if (q < 3) {
    // failed — reset the streak, see it again soon
    repetitions = 0;
    interval = 0;
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else {
      if (options?.isEarly && options.daysElapsed !== undefined) {
        // Proportional interval scaling
        const scaledInterval = options.daysElapsed + (interval - options.daysElapsed) * (easeFactor - 1);
        interval = Math.round(Math.max(interval, scaledInterval));
      } else {
        interval = Math.round(interval * easeFactor);
      }
    }

    easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;
  }

  const status: CardStatus = isGraduated({ repetitions, interval }) ? "known" : "learning";

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + Math.max(interval, 0));
  // failed cards come back in ~10 minutes, not a full day
  if (interval === 0) nextReview.setTime(Date.now() + 10 * 60 * 1000);

  return { easeFactor, interval, repetitions, status, nextReview };
}

/** A 0..1 progress value derived from SM-2 state (no stored mastery). */
export function progress(state: SrsState): number {
  const repPart = Math.min(state.repetitions / GRADUATED_REPETITIONS, 1);
  const intPart = Math.min(state.interval / GRADUATED_INTERVAL_DAYS, 1);
  return Math.round(((repPart + intPart) / 2) * 100) / 100;
}
