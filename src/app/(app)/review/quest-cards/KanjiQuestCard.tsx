/**
 * Kanji Quest Card
 */

type KanjiQuestCardProps = {
  onStart: () => void;
  /** Live due kanji count from the composition API. Null while loading. */
  dueCount: number | null;
  /** Shown instead of "UP TO DATE" when new kanji cards are being withheld. */
  pauseNote?: string | null;
};

export default function KanjiQuestCard({
  onStart,
  dueCount,
  pauseNote = null,
}: KanjiQuestCardProps) {
  const countLabel =
    dueCount === null
      ? null
      : dueCount === 0
        ? pauseNote
          ? "NEW CARDS PAUSED"
          : "UP TO DATE"
        : dueCount > 50
          ? "50+ DUE"
          : `${dueCount} DUE`;

  return (
    <button
      onClick={onStart}
      className="group relative w-full flex flex-col justify-between text-left rounded-3xl border-2 border-border bg-gradient-to-br from-card to-amber/5 p-5 md:p-6 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-amber/15 hover:border-amber/40 cursor-pointer shadow-sm overflow-hidden min-h-[160px]"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-amber/0 via-amber/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="absolute -right-2 -bottom-4 text-[80px] font-bold font-jp text-amber/8 select-none pointer-events-none leading-none group-hover:text-amber/15 transition-colors duration-500">
        漢
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber/15 text-xl font-bold font-jp text-amber group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 shadow-xs">
            漢
          </span>
          <h3 className="font-display text-base md:text-lg font-extrabold text-foreground">Kanji Quest</h3>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          Master kanji with meanings, readings &amp; mnemonics.
        </p>
      </div>

      <div className="relative z-10 flex flex-wrap gap-1.5 mt-4">
        <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-amber/15 text-amber border border-amber/20">KANJI FOCUS</span>
        {countLabel && (
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold ${dueCount === 0 ? "bg-mint/10 text-mint" : "bg-amber/10 text-amber"}`}>
            {countLabel}
          </span>
        )}
      </div>

      {pauseNote && dueCount === 0 && (
        <p className="relative z-10 mt-2 text-[10px] leading-relaxed text-muted">{pauseNote}</p>
      )}
    </button>
  );
}
