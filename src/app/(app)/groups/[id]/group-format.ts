/** Formatting helpers shared by the group chat view and its message bubbles. */

export function timeLabel(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Divider label between chat sessions: new day, or a gap over an hour. */
export function sessionDivider(
  prevIso: string | undefined,
  iso: string
): string | null {
  const cur = new Date(iso);
  if (Number.isNaN(cur.getTime())) return null;
  if (!prevIso) return dayLabel(cur);
  const prev = new Date(prevIso);
  const sameDay = prev.toDateString() === cur.toDateString();
  const gapMs = cur.getTime() - prev.getTime();
  if (!sameDay) return dayLabel(cur);
  if (gapMs > 60 * 60 * 1000) return timeLabel(cur); // >1h gap = new session
  return null;
}

function dayLabel(d: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}
