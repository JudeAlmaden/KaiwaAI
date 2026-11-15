/**
 * One definition of a card's lifecycle, used by scheduling, session composition,
 * the learning-pool gate and the UI.
 *
 * - new:       never graded (repetitions === 0)
 * - learning:  graded at least once, not graduated yet
 * - known:     graduated — survived 3 successful reviews spread over 21+ days
 *
 * Graduation used to be defined three different ways (composer: reps === 0;
 * FSRS: stability > 21 && difficulty < 6; SM-2: reps >= 3 && interval >= 21),
 * which is why 77 of 155 cards sat in "learning" forever while new-card gates
 * thought the pool was full.
 */

import type { CardStatus } from "@/lib/types";

export const GRADUATED_REPETITIONS = 3;
export const GRADUATED_INTERVAL_DAYS = 21;

/** Scheduling ceiling: no card is ever scheduled more than ten years out. */
export const MAX_INTERVAL_DAYS = 3650;

export type CardLifecycleState = {
  repetitions?: number | null;
  interval?: number | null;
  /** Total grades applied. A lapsed card has repetitions 0 but reviews > 0. */
  timesReviewed?: number | null;
};

/**
 * Never studied — not merely back at repetitions 0 after a lapse. Treating a
 * lapsed card as new made it consume new-card quota, appear in "new" counts,
 * and vanish from the in-progress pool all at once.
 */
export function isNewCard(card: CardLifecycleState): boolean {
  return (card.repetitions ?? 0) === 0 && (card.timesReviewed ?? 0) === 0;
}

export function isGraduated(card: CardLifecycleState): boolean {
  return (
    (card.repetitions ?? 0) >= GRADUATED_REPETITIONS &&
    (card.interval ?? 0) >= GRADUATED_INTERVAL_DAYS
  );
}

export function isLearningCard(card: CardLifecycleState): boolean {
  return !isNewCard(card) && !isGraduated(card);
}

/** Stored status string derived from the single lifecycle rule. */
export function cardStatus(card: CardLifecycleState): CardStatus {
  if (isGraduated(card)) return "known";
  return "learning";
}

/**
 * Prisma filter for cards actively being learned (not new, not graduated).
 * Kept as a value so query sites cannot invent their own definition.
 */
export const LEARNING_CARD_WHERE = {
  OR: [
    // Graded but not graduated.
    { repetitions: { gt: 0, lt: GRADUATED_REPETITIONS } },
    { repetitions: { gte: GRADUATED_REPETITIONS }, interval: { lt: GRADUATED_INTERVAL_DAYS } },
    // Lapsed back to repetitions 0 — still in progress, so the pool cap counts it.
    { repetitions: 0, timesReviewed: { gt: 0 } },
  ],
};
