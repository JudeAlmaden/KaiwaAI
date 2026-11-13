/**
 * New-card intake: how many brand-new cards a session may introduce.
 *
 * Two limits combine:
 *   - the per-session quota (a deliberate drip, not a proportion)
 *   - the daily ceiling minus what was already introduced today
 *
 * "Introduced today" is counted from cards sitting on exactly one successful
 * review whose last review happened today — the card's first success. A card
 * failed on its first review drops back to repetitions 0 and is not counted.
 */

export function startOfToday(now: Date = new Date()): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function dailyNewRemaining(maxNewCards: number, introducedToday: number): number {
  const max = Number.isNaN(maxNewCards) ? 0 : maxNewCards;
  const introduced = Number.isNaN(introducedToday) ? 0 : introducedToday;
  return Math.max(0, Math.max(0, max) - Math.max(0, introduced));
}

export function resolveNewAllowance(options: {
  maxNewCards: number;
  maxNewPerSession?: number;
  introducedToday: number;
}): number {
  const daily = dailyNewRemaining(options.maxNewCards, options.introducedToday);
  const quota =
    options.maxNewPerSession === undefined || Number.isNaN(options.maxNewPerSession)
      ? Number.POSITIVE_INFINITY
      : Math.max(0, options.maxNewPerSession);
  return Math.min(daily, quota);
}

/** Prisma filter for cards that had their first successful review today. */
export function introducedTodayWhere(userId: string, now: Date = new Date()) {
  return {
    userId,
    repetitions: 1,
    lastReviewedAt: { gte: startOfToday(now) },
  };
}
