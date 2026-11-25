/**
 * Carry-over for the Construction stream: the unanswered question that was on
 * screen when the learner left, so a reload resumes it instead of skipping it.
 *
 * Generated exercises are deterministic (id = word + kind + concept), so only
 * the id is stored and the bank is rebuilt on load. Ids that no longer exist —
 * a deleted deck word, a changed template — are dropped silently. Nothing
 * personal is kept, and the value expires with the day.
 */

export const CARRYOVER_KEY = "kaiwa:forge:carryover:v1";
/** Restoring the same unanswered item this many times drops it instead. */
export const MAX_UNANSWERED_LOADS = 3;

export type CarryOverState = {
  savedAt: number;
  /** Local calendar day, so yesterday's question does not greet you. */
  day: string;
  current: string | null;
  /** How many loads restored `current` without an answer. */
  loads: number;
};

export function localDay(now: Date = new Date()): string {
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const date = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${date}`;
}

export function emptyCarryOver(now: Date = new Date()): CarryOverState {
  return { savedAt: now.getTime(), day: localDay(now), current: null, loads: 0 };
}

export function decodeCarryOver(raw: string | null, now: Date = new Date()): CarryOverState {
  if (!raw) return emptyCarryOver(now);
  try {
    const parsed = JSON.parse(raw) as Partial<CarryOverState>;
    if (parsed.day !== localDay(now)) return emptyCarryOver(now);
    return {
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : now.getTime(),
      day: localDay(now),
      current: typeof parsed.current === "string" && parsed.current ? parsed.current : null,
      loads: Number.isFinite(parsed.loads) ? Math.max(0, Number(parsed.loads)) : 0,
    };
  } catch {
    return emptyCarryOver(now);
  }
}

export function encodeCarryOver(state: CarryOverState): string {
  return JSON.stringify(state);
}

/**
 * The id to resume, or null when it was answered, is from another day, belongs
 * to an exercise the rebuilt bank no longer has, or has been skipped too often.
 */
export function resolveCarryOver(
  state: CarryOverState,
  ids: Set<string>,
  now: Date = new Date()
): string | null {
  if (state.day !== localDay(now)) return null;
  if (!state.current || !ids.has(state.current)) return null;
  if (state.loads >= MAX_UNANSWERED_LOADS) return null;
  return state.current;
}

export function noteLoaded(state: CarryOverState, now: Date = new Date()): CarryOverState {
  return { ...state, savedAt: now.getTime(), day: localDay(now), loads: state.loads + 1 };
}

export function setCurrent(
  state: CarryOverState,
  id: string,
  now: Date = new Date()
): CarryOverState {
  return { ...state, savedAt: now.getTime(), day: localDay(now), current: id, loads: 0 };
}

export function clearCurrent(
  state: CarryOverState,
  now: Date = new Date()
): CarryOverState {
  return { ...state, savedAt: now.getTime(), day: localDay(now), current: null, loads: 0 };
}
