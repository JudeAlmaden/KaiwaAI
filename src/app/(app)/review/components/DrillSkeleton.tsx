/**
 * Placeholder shown while Fill the blank loads its words.
 *
 * Shaped like the real cards (stats row, word card, prompt, actions) so the
 * content lands without a jump, with one polite status line for screen readers.
 */
export function DrillSkeleton() {
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <span className="sr-only">Loading words</span>
      <div className="animate-pulse space-y-4 motion-reduce:animate-none" aria-hidden="true">
        <div className="h-11 rounded-2xl border-2 border-border bg-card" />
        <div className="h-20 rounded-3xl border-2 border-border bg-card" />
        <div className="space-y-3 rounded-3xl border-2 border-border bg-card p-5">
          <div className="h-3 w-24 rounded-full bg-border" />
          <div className="h-5 w-2/3 rounded-full bg-border" />
          <div className="h-12 w-full rounded-2xl bg-surface" />
        </div>
        <div className="h-16 rounded-3xl border-2 border-border bg-card/70" />
      </div>
    </div>
  );
}
