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

import { dayKeyFor, startOfDayInTimezone } from "@/lib/day";

/**
 * Midnight that begins "today" for the learner. Pass the user's timezone: the
 * daily ceiling is a calendar-day limit, and server-local midnight made it
 * reset at an arbitrary hour (08:00 for a UTC+8 learner on a UTC host).
 */
export function startOfToday(now: Date = new Date(), timeZone?: string | null): Date {
  if (timeZone) {
    return startOfDayInTimezone(dayKeyFor(now, timeZone), timeZone);
  }
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

export type IntakePauseReason = "off" | "learning-pool" | "ready";

export type IntakeStatus = {
  allowance: number;
  reason: IntakePauseReason;
};

/**
 * Whether the in-progress learning cap blocks new cards. Zero or missing means
 * unlimited, so the gate is skipped instead of blocking everything.
 *
 * The cap is per deck. Vocabulary and kanji are studied in separate quests, so
 * one deck's backlog must never freeze intake in the other: each quest counts
 * only its own deck, and a mixed session gates each half separately instead of
 * summing them (18 vocabulary + 1 kanji used to read as 19 of 20 and pause both).
 */
export function isLearningPoolFull(options: {
  inProgress?: number | null;
  maxLearningPool?: number | null;
}): boolean {
  const cap = options.maxLearningPool ?? 0;
  if (cap <= 0) return false;
  return (options.inProgress ?? 0) >= cap;
}

export function describeIntake(options: {
  maxNewPerSession: number;
  inProgress: number;
  maxLearningPool: number;
}): IntakeStatus {
  if (options.maxNewPerSession <= 0) {
    return { allowance: 0, reason: "off" };
  }

  if (isLearningPoolFull(options)) {
    return { allowance: 0, reason: "learning-pool" };
  }

  return { allowance: options.maxNewPerSession, reason: "ready" };
}

/** Prisma filter for cards first successfully reviewed today. */
export function introducedTodayWhere(
  userId: string,
  now: Date = new Date(),
  timeZone?: string | null
) {
  return {
    userId,
    firstLearnedAt: { gte: startOfToday(now, timeZone) },
  };
}
