/**
 * Daily review ceiling (Learning settings → "Max daily reviews").
 *
 * Distinct from the per-session Goal: this one counts what has already been
 * reviewed today (in the learner's timezone) and shrinks the session so the day
 * never runs past the ceiling. Sessions used to ignore it entirely — only the
 * home projection honoured it, so the setting appeared to do nothing.
 */
export function remainingDailyReviews(
  maxDailyReviews: number | undefined | null,
  reviewedToday: number
): number | undefined {
  if (maxDailyReviews === undefined || maxDailyReviews === null) return undefined;
  const cap = Number.isFinite(maxDailyReviews) ? Math.max(0, Math.floor(maxDailyReviews)) : 0;
  const done = Number.isFinite(reviewedToday) ? Math.max(0, Math.floor(reviewedToday)) : 0;
  return Math.max(0, cap - done);
}

/** Session size after the daily ceiling. No cap (`undefined`) leaves it alone. */
export function clampSessionToDailyCap(
  size: number,
  remaining: number | undefined
): number {
  const safeSize = Math.max(0, Math.floor(Number.isFinite(size) ? size : 0));
  if (remaining === undefined) return safeSize;
  const left = Math.max(0, Math.floor(Number.isFinite(remaining) ? remaining : 0));
  return Math.min(safeSize, left);
}
