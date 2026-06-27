// Streak logic: a "day" is the user's local dayKey. Being active (chatting)
// on consecutive days grows the streak; a gap resets it.

export type StreakState = {
  streakCount: number;
  streakBestCount: number;
  lastStreakDay: string | null;
};

/** Given the current streak state and today's dayKey, compute the new state.
 *  Returns null if no change is needed (already counted today). */
export function advanceStreak(
  state: StreakState,
  todayKey: string,
  yesterdayKey: string
): StreakState | null {
  if (state.lastStreakDay === todayKey) return null; // already counted today

  let count: number;
  if (state.lastStreakDay === yesterdayKey) {
    count = state.streakCount + 1; // consecutive day
  } else {
    count = 1; // first day or streak broken
  }

  return {
    streakCount: count,
    streakBestCount: Math.max(count, state.streakBestCount),
    lastStreakDay: todayKey,
  };
}

/** Whether a stored streak is still "alive" relative to today (for display).
 *  A streak counts as current if the last active day is today or yesterday. */
export function currentStreak(
  state: StreakState,
  todayKey: string,
  yesterdayKey: string
): number {
  if (state.lastStreakDay === todayKey || state.lastStreakDay === yesterdayKey) {
    return state.streakCount;
  }
  return 0; // lapsed
}
