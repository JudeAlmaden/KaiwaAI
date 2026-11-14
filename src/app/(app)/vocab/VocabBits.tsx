"use client";

/** One segment of the learned/known progress bar in the page header. */
export function Seg({
  value,
  total,
  className,
}: {
  value: number;
  total: number;
  className: string;
}) {
  if (value === 0) return null;
  return <div className={`h-full ${className}`} style={{ flex: value / total }} />;
}

/** Mastery ring shown on each card row. */
export function Ring({ pct }: { pct: number }) {
  const r = 9;
  const circ = 2 * Math.PI * r;
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" className="shrink-0">
      <circle cx="13" cy="13" r={r} fill="none" stroke="var(--border)" strokeWidth="3" />
      <circle
        cx="13"
        cy="13"
        r={r}
        fill="none"
        stroke="var(--indigo)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct / 100)}
        transform="rotate(-90 13 13)"
      />
    </svg>
  );
}
