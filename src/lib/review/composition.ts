/**
 * Visible session composition: how many cards in a session are brand-new vs
 * already reviewed. Kept pure so the home button and the session header
 * describe the mix the same way the composer builds it.
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
};

export type SessionMixOptions = {
  learningRatio: number;
  /** Daily ceiling on new cards. */
  maxNewCards: number;
  /** Fixed per-session new-card intake. Unlimited when omitted. */
  maxNewPerSession?: number;
  /** Session size cap (Goal / limit). */
  maxReviews?: number;
  /** Cards currently in progress — blocks intake when the cap is reached. */
  inProgress?: number;
  /** Max in-progress learning cards (0 or omitted = unlimited). */
  maxLearningPool?: number;
};

const clampRatio = (ratio: number) =>
  Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0.5));

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
 * Mirror the composer for a session that hasn't been built yet: the active share
 * of the session holds the new cards (rationed by the intake quota and the daily
 * ceiling), and reviews fill everything else. Extra new cards never pad a
 * session — if there aren't enough reviews the session is simply shorter.
 */
export function projectSessionMix(
  due: DueCounts,
  options: SessionMixOptions
): CompositionCounts & { total: number } {
  const dueNew = Math.max(0, due.new);
  const dueReview = Math.max(0, due.review);
  const size = Math.min(
    dueNew + dueReview,
    Math.max(0, options.maxReviews ?? dueNew + dueReview)
  );
  const ratio = clampRatio(options.learningRatio);
  const activeTarget =
    ratio === 0 ? 0 : Math.min(size, Math.max(1, Math.round(size * ratio)));

  const quota = Math.min(
    Math.max(0, options.maxNewCards),
    options.maxNewPerSession ?? Number.POSITIVE_INFINITY
  );

  // A full learning pool pauses intake, exactly as the routes do, so the home
  // button cannot promise new cards the session will refuse to deliver.
  const poolFull = isLearningPoolFull({
    inProgress: options.inProgress,
    maxLearningPool: options.maxLearningPool,
  });

  const newCount = poolFull ? 0 : Math.min(dueNew, activeTarget, quota);
  const reviewCount = Math.min(dueReview, size - newCount);

  return { newCount, reviewCount, total: newCount + reviewCount };
}

/** "6 review · 4 new" (omits whichever side is empty). */
export function formatComposition(counts: CompositionCounts): string {
  const parts: string[] = [];
  if (counts.reviewCount > 0) parts.push(`${counts.reviewCount} review`);
  if (counts.newCount > 0) parts.push(`${counts.newCount} new`);
  return parts.join(" · ");
}
