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
