/**
 * Daily Quest Card - Hero card spanning full width
 */

type DailyQuestCardProps = {
  dueCount: number | null;
  onStart: () => void;
};

export default function DailyQuestCard({ dueCount, onStart }: DailyQuestCardProps) {
  return (
    <button
      onClick={onStart}
      disabled={dueCount === 0}
      className="group relative w-full flex flex-col justify-between text-left rounded-3xl border-2 border-indigo-ai/30 bg-gradient-to-br from-indigo-ai/5 via-card to-card p-6 md:p-7 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-ai/15 hover:border-indigo-ai/50 cursor-pointer disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none shadow-sm overflow-hidden min-h-[160px]"
    >
      {/* Background radial highlight */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_30%,rgba(124,92,255,0.08),transparent_65%)] group-hover:opacity-150 transition-opacity duration-500" />
      </div>

      {/* Ghost kanji watermark */}
      <div className="absolute right-4 top-2 text-[100px] font-bold font-jp text-indigo-ai/5 select-none pointer-events-none leading-none group-hover:text-indigo-ai/10 transition-colors duration-500">
        日
      </div>

      {/* Top section: Icon & Details */}
      <div className="relative z-10 flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-ai/15 text-3xl group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 shadow-xs">
          ⚔️
        </span>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <h3 className="font-display text-xl font-extrabold text-foreground">Daily Quest</h3>
            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold bg-indigo-ai/20 text-indigo-ai border border-indigo-ai/30 tracking-wide uppercase">
              RECOMMENDED
            </span>
          </div>
          <p className="text-xs md:text-sm text-muted leading-relaxed max-w-2xl">
            Clear your daily review backlog. Up to 50 cards per session with mixed content.
          </p>
        </div>
      </div>

      {/* Bottom section: Chips */}
      <div className="relative z-10 flex flex-wrap items-center gap-2.5 mt-5">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-indigo-ai/15 text-indigo-ai border border-indigo-ai/30">
          {dueCount === null
            ? "⏳ Checking..."
            : dueCount === 0
              ? "✓ All caught up!"
              : dueCount > 50
                ? "🎯 50+ CARDS READY"
                : `🎯 ${dueCount} CARD${dueCount === 1 ? "" : "S"} READY`}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-ai/10 text-indigo-ai/80">
          <span className="w-2 h-2 rounded-full bg-indigo-ai animate-pulse" />
          Active
        </span>
      </div>
    </button>
  );
}
