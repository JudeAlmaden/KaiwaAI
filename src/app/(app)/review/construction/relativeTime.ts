/** "in 4h" / "2d ago", for the mastery panel. */
export function relativeTime(value?: string | Date | null): string {
  if (!value) return "—";
  const diff = new Date(value).getTime() - Date.now();
  const minutes = Math.round(Math.abs(diff) / 60_000);
  const past = diff <= 0;
  if (minutes < 1) return past ? "just now" : "now";
  const text =
    minutes < 60
      ? `${minutes}m`
      : minutes < 1440
        ? `${Math.round(minutes / 60)}h`
        : `${Math.round(minutes / 1440)}d`;
  return past ? `${text} ago` : `in ${text}`;
}
