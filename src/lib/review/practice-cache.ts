/**
 * Local caches for Fill the blank.
 *
 * The word pool is worth keeping for one sitting: the review endpoint runs
 * session composition and a kanji lookup, so re-reading it on every visit is
 * the slowest part of the page. The round pointer records which word and form
 * were on screen, so a reload resumes that question instead of skipping it.
 *
 * Rounds cannot be rebuilt from an id (they depend on the fetched cards, a
 * shuffled order and the pattern's stage), so only the pointer is stored and
 * it is matched against the rounds rebuilt from the pool.
 */

export const POOL_KEY = "kaiwa:conjugation:pool:v1";
export const ROUND_KEY = "kaiwa:conjugation:round:v1";
/** Practice-only data: a stale pool is fine, a stale page is not. */
export const POOL_TTL_MS = 30 * 60 * 1000;

type PoolCache = {
  savedAt: number;
  studyMode: string;
  targets: unknown[];
};

type RoundCache = {
  savedAt: number;
  day: string;
  word: string;
  formType: string;
};

function localDay(now: Date): string {
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const date = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${date}`;
}

/** Cached targets for this study mode, or null when missing/expired/foreign. */
export function decodePool<T>(
  raw: string | null,
  studyMode: string,
  now: Date = new Date()
): T[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PoolCache>;
    if (parsed.studyMode !== studyMode) return null;
    if (typeof parsed.savedAt !== "number") return null;
    if (now.getTime() - parsed.savedAt > POOL_TTL_MS) return null;
    if (!Array.isArray(parsed.targets) || parsed.targets.length === 0) return null;
    return parsed.targets as T[];
  } catch {
    return null;
  }
}

export function encodePool<T>(
  targets: T[],
  studyMode: string,
  now: Date = new Date()
): string {
  const payload: PoolCache = { savedAt: now.getTime(), studyMode, targets };
  return JSON.stringify(payload);
}

export type RoundPointer = { word: string; formType: string };

export function decodeRound(raw: string | null, now: Date = new Date()): RoundPointer | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<RoundCache>;
    if (parsed.day !== localDay(now)) return null;
    if (typeof parsed.word !== "string" || !parsed.word) return null;
    if (typeof parsed.formType !== "string" || !parsed.formType) return null;
    return { word: parsed.word, formType: parsed.formType };
  } catch {
    return null;
  }
}

export function encodeRound(pointer: RoundPointer, now: Date = new Date()): string {
  const payload: RoundCache = {
    savedAt: now.getTime(),
    day: localDay(now),
    word: pointer.word,
    formType: pointer.formType,
  };
  return JSON.stringify(payload);
}
