/**
 * Visible session composition: how many cards in a session are brand-new vs
 * already reviewed, and how many cards a quest can actually hand over right now.
 * Kept pure so the quest cards and the routes describe the same session.
 */

import { isNewCard } from "./lifecycle";
import { isLearningPoolFull } from "./intake";

export { isNewCard };

export type CompositionCounts = {
  newCount: number;
  reviewCount: number;
};

export type DueCounts = {
  new: number;
  review: number;
  /** Studied, not due yet — only a `fill` session falls back to these. */
  ahead?: number;
};

export type QuestDeliveryOptions = {
  /** Fixed per-session new-card intake. Unlimited when omitted. */
  maxNewPerSession?: number;
  /** Session size cap (the quest's card limit). */
  maxReviews?: number;
  /** Cards currently in progress — blocks intake when the cap is reached. */
  inProgress?: number;
  /** Max in-progress learning cards (0 or omitted = unlimited). */
  maxLearningPool?: number;
};

export function summarizeComposition(
  cards: { repetitions?: number | null; interval?: number | null }[]
): CompositionCounts {
  let newCount = 0;
  for (const card of cards) {
    if (isNewCard(card)) newCount++;
  }
  return { newCount, reviewCount: cards.length - newCount };
}

/**
 * What one quest can hand over right now, mirroring what the review routes
 * build: due reviews are always served, brand-new cards only inside the
 * per-session intake drip and only while the in-progress learning cap allows
 * intake, and never more than the quest's card limit.
 *
 * This is the single rule behind every count in the app, so a quest card can
 * never advertise a card its session will withhold.
 */
export function projectQuestDelivery(
  due: DueCounts,
  options: QuestDeliveryOptions = {}
): { new: number; review: number; total: number } {
  const dueNew = Math.max(0, due.new);
  const dueReview = Math.max(0, due.review);
  const available = dueNew + dueReview;
  const cap = Math.max(0, options.maxReviews ?? available);
  const quota =
    options.maxNewPerSession === undefined || Number.isNaN(options.maxNewPerSession)
      ? Number.POSITIVE_INFINITY
      : Math.max(0, options.maxNewPerSession);
  const poolFull = isLearningPoolFull({
    inProgress: options.inProgress,
    maxLearningPool: options.maxLearningPool,
  });

  const newCount = poolFull ? 0 : Math.min(dueNew, quota, cap);
  const reviewCount = Math.min(dueReview, cap - newCount);

  return { new: newCount, review: reviewCount, total: newCount + reviewCount };
}

/** "6 review · 4 new" (omits whichever side is empty). */
export function formatComposition(counts: CompositionCounts): string {
  const parts: string[] = [];
  if (counts.reviewCount > 0) parts.push(`${counts.reviewCount} review`);
  if (counts.newCount > 0) parts.push(`${counts.newCount} new`);
  return parts.join(" · ");
}
