/**
 * Endless Zen Card - Spans 2 columns horizontally
 */

type EndlessZenCardProps = {
  onStart: () => void;
};

export default function EndlessZenCard({ onStart }: EndlessZenCardProps) {
  return (
    <button
      onClick={onStart}
      className="group relative w-full flex flex-col justify-between text-left rounded-3xl border-2 border-border bg-gradient-to-br from-card via-mint/5 to-card p-5 md:p-6 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-mint/15 hover:border-mint/40 cursor-pointer shadow-sm overflow-hidden min-h-[160px]"
    >
      {/* Ambient blobs */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-mint/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000 pointer-events-none" />
      <div className="absolute -right-2 -bottom-4 text-[90px] font-bold font-jp text-mint/6 select-none pointer-events-none leading-none group-hover:text-mint/12 transition-colors duration-500">
        禅
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between w-full mb-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-mint/15 text-2xl group-hover:scale-110 group-hover:rotate-180 transition-transform duration-700">
            🌀
          </span>
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold bg-mint/20 text-mint border border-mint/30 tracking-wide uppercase">
            INFINITE
          </span>
        </div>
        <h3 className="font-display text-lg md:text-xl font-extrabold text-foreground mb-1">
          Endless Zen
        </h3>
        <p className="text-xs md:text-sm text-muted leading-relaxed">
          Continuous study mode with no limits. Perfect for deep practice sessions.
        </p>
      </div>

      <div className="relative z-10 pt-1 border-mint/20 flex items-center gap-2.5">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-mint/15 text-mint border border-mint/30 uppercase tracking-wide">
          ∞ CONTINUOUS MODE
        </span>
      </div>
    </button>
  );
}
