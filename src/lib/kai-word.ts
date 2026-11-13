/**
 * "Word of the moment" for Kai's room: one card from the learner's own deck,
 * rotated by day so the home screen feels alive without any AI call.
 */
export type DailyWord = {
  id: string;
  surface: string;
  reading: string;
  meaning: string;
};

/** Stable 32-bit hash of the rotation key (dayKey + userId). */
function hashKey(key: string): number {
  let hash = 0;
  for (const char of key) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

/** Same deck + same day = same word, so reloading doesn't shuffle it. */
export function pickDailyWord<T>(items: T[], key: string): T | null {
  if (items.length === 0) return null;
  return items[hashKey(key) % items.length];
}
