/**
 * Daily Quest Card - Large featured card for daily reviews
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
      className="group relative col-span-2 md:col-span-2 lg:col-span-3 flex flex-col gap-4 text-left rounded-3xl border-2 border-border bg-gradient-to-br from-card to-indigo-ai/5 p-5 md:p-6 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-ai/20 hover:border-indigo-ai/40 cursor-pointer disabled:opacity-50 disabled:-translate-y-0 disabled:shadow-none shadow-md overflow-hidden"
    >
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_50%)] group-hover:scale-110 transition-transform duration-700" />
      </div>
      
      <div className="relative z-10 flex items-center gap-3 md:gap-4 flex-1">
        <span className="flex h-14 w-14 md:h-16 md:w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-ai/15 text-3xl md:text-4xl group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300">
          ⚔️
        </span>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1 md:mb-2">
            <h3 className="font-display text-lg md:text-xl lg:text-2xl font-extrabold text-foreground">Daily Quest</h3>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-ai/20 text-indigo-ai border border-indigo-ai/30">RECOMMENDED</span>
          </div>
          <p className="text-xs md:text-sm leading-relaxed text-muted">
            Clear your daily review backlog. Up to 50 cards per session with mixed content.
          </p>
        </div>
      </div>
      
      <div className="relative z-10 flex flex-wrap items-center gap-2 md:gap-3">
        <span className="inline-block px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-wide bg-indigo-ai/15 text-indigo-ai border border-indigo-ai/20">
          {dueCount === null
            ? "⏳ Checking..."
            : dueCount === 0
              ? "✓ All caught up!"
              : dueCount > 50
                ? `🎯 50+ cards ready`
                : `🎯 ${dueCount} card${dueCount === 1 ? "" : "s"} ready`}
        </span>
        {dueCount !== null && dueCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg bg-indigo-ai/10">
            <div className="h-1.5 md:h-2 w-1.5 md:w-2 rounded-full bg-indigo-ai animate-pulse" />
            <span className="text-[10px] md:text-xs text-indigo-ai font-bold">Active</span>
          </div>
        )}
      </div>
    </button>
  );
}
