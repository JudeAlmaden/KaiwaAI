/**
 * Leech detection — a card the learner keeps failing to retain.
 *
 * Deliberately the same rule the `leeches` review pool uses in
 * /api/review/mixed and /api/flashcards/review (8+ reviews, interval still
 * under a week) so the badge and the deck filter never disagree.
 */
export const LEECH_MIN_REVIEWS = 8;
export const LEECH_MAX_INTERVAL_DAYS = 7;

export type LeechInput = {
  timesReviewed?: number | null;
  interval?: number | null;
};

export function isLeech(card: LeechInput): boolean {
  const reviews = card.timesReviewed ?? 0;
  const interval = card.interval ?? 0;
  return reviews >= LEECH_MIN_REVIEWS && interval < LEECH_MAX_INTERVAL_DAYS;
}
