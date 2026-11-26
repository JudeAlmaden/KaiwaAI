/**
 * Leech detection — a card the learner keeps failing to retain.
 *
 * Lapse-based: only grade-0 reviews count, so a card that is merely old is not
 * a leech. Deliberately the same rule the `leeches` review pool uses in
 * /api/review/mixed, /api/flashcards/review and /api/kanji/review so the badge
 * and the deck filter never disagree.
 */
export const LEECH_MIN_LAPSES = 5;
export const LEECH_MAX_INTERVAL_DAYS = 7;

export type LeechInput = {
  lapses?: number | null;
  interval?: number | null;
};

export function isLeech(card: LeechInput): boolean {
  const lapses = card.lapses ?? 0;
  const interval = card.interval ?? 0;
  return lapses >= LEECH_MIN_LAPSES && interval < LEECH_MAX_INTERVAL_DAYS;
}
