/** Formatting helpers shared by the group chat view and its message bubbles. */

export function timeLabel(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
