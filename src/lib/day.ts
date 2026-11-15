// Day-bucket helpers. dayKey is stamped at write time in the user's timezone so
// the day boundary is frozen at insert (no midnight/DST ambiguity later).

export function dayKeyFor(date: Date, timeZone: string): string {
  // en-CA gives YYYY-MM-DD
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }
}

export function monthKeyOf(dayKey: string): string {
  return dayKey.slice(0, 7); // "2026-06"
}

/** The dayKey for the day before the given one (string math, tz-safe). */
export function previousDayKey(dayKey: string): string {
  const d = new Date(dayKey + "T12:00:00Z"); // noon avoids DST edge issues
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Human label for a day divider in the chat stream. */
export function dayLabel(dayKey: string, todayKey: string): string {
  if (dayKey === todayKey) return "Today";
  const today = new Date(todayKey + "T00:00:00");
  const that = new Date(dayKey + "T00:00:00");
  const diff = Math.round((today.getTime() - that.getTime()) / 86400000);
  if (diff === 1) return "Yesterday";
  return new Date(dayKey + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Wall-clock reading of an instant in `timeZone`, expressed as a UTC epoch. */
function wallClockAsUtc(instantMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(instantMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
}

/**
 * Returns the UTC Date corresponding to midnight (start of day) for a dayKey in
 * the given timezone.
 *
 * The offset is resolved iteratively against the candidate instant rather than
 * against UTC midnight, so a zone whose clocks change on the day still lands on
 * its own midnight. Where midnight does not exist (spring-forward at 00:00) the
 * nearest valid instant is returned.
 */
export function startOfDayInTimezone(dayKey: string, timeZone: string = "UTC"): Date {
  try {
    const [year, month, day] = dayKey.split("-").map(Number);
    const midnightUtc = Date.UTC(year, month - 1, day, 0, 0, 0);

    let guess = midnightUtc - (wallClockAsUtc(midnightUtc, timeZone) - midnightUtc);
    for (let i = 0; i < 3; i++) {
      const delta = midnightUtc - wallClockAsUtc(guess, timeZone);
      if (delta === 0) break;
      guess += delta;
    }

    return new Date(guess);
  } catch {
    return new Date(`${dayKey}T00:00:00Z`);
  }
}

