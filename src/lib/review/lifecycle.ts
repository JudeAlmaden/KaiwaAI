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
};

export function isNewCard(card: CardLifecycleState): boolean {
  return (card.repetitions ?? 0) === 0;
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
  repetitions: { gt: 0 },
  OR: [
    { repetitions: { lt: GRADUATED_REPETITIONS } },
    { interval: { lt: GRADUATED_INTERVAL_DAYS } },
  ],
};
