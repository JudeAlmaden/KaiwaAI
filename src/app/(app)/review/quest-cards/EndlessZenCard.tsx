/**
 * Endless Zen Card - Continuous study mode
 */

type EndlessZenCardProps = {
  onStart: () => void;
};

export default function EndlessZenCard({ onStart }: EndlessZenCardProps) {
  return (
    <button
      onClick={onStart}
      className="group relative col-span-2 md:col-span-2 flex flex-col gap-3 md:gap-4 text-left rounded-3xl border-2 border-border bg-gradient-to-br from-card via-mint/5 to-card p-5 md:p-6 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-mint/20 hover:border-mint/40 cursor-pointer shadow-md overflow-hidden"
    >
      {/* Animated zen pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-mint/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-mint/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
      </div>
      
      <div className="relative z-10 flex items-center gap-3 md:gap-4 flex-1">
        <span className="flex h-14 w-14 md:h-16 md:w-16 shrink-0 items-center justify-center rounded-2xl bg-mint/15 text-3xl md:text-4xl group-hover:scale-110 group-hover:rotate-180 transition-transform duration-700">
          🌀
        </span>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1 md:mb-2">
            <h3 className="font-display text-lg md:text-xl lg:text-2xl font-extrabold text-foreground">Endless Zen</h3>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-mint/20 text-mint border border-mint/30">INFINITE</span>
          </div>
          <p className="text-xs md:text-sm leading-relaxed text-muted">
            Continuous study mode with no limits. Perfect for deep practice sessions.
          </p>
        </div>
      </div>
      
      <div className="relative z-10 flex flex-wrap items-center gap-2">
        <span className="inline-block px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-wide bg-mint/15 text-mint border border-mint/20">
          ∞ Continuous Mode
        </span>
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-mint/60 animate-pulse" style={{ animationDelay: '0ms' }} />
          <div className="h-1.5 w-1.5 rounded-full bg-mint/60 animate-pulse" style={{ animationDelay: '150ms' }} />
          <div className="h-1.5 w-1.5 rounded-full bg-mint/60 animate-pulse" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </button>
  );
}
