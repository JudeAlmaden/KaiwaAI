/**
 * Kanji Quest Card
 */

type KanjiQuestCardProps = {
  onStart: () => void;
};

export default function KanjiQuestCard({ onStart }: KanjiQuestCardProps) {
  return (
    <button
      onClick={onStart}
      className="group relative flex flex-col text-left rounded-3xl border-2 border-border bg-gradient-to-br from-card to-amber/5 p-4 md:p-5 lg:p-6 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-amber/20 hover:border-amber/40 cursor-pointer shadow-md overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-amber/0 via-amber/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10 flex-1">
        <div className="flex items-center gap-2.5 md:gap-3 mb-2 md:mb-3">
          <span className="flex h-11 w-11 md:h-12 md:w-12 lg:h-14 lg:w-14 shrink-0 items-center justify-center rounded-2xl bg-amber/15 text-2xl md:text-2xl lg:text-3xl group-hover:scale-110 transition-transform duration-300 font-jp">
            漢
          </span>
          <h3 className="font-display text-base md:text-lg lg:text-xl font-extrabold text-foreground">Kanji Quest</h3>
        </div>
        <p className="text-xs md:text-sm text-muted leading-relaxed mb-3 md:mb-4">
          Master kanji with meanings, readings & mnemonics.
        </p>
        <div className="flex flex-wrap gap-1.5 md:gap-2">
          <span className="px-2 md:px-2.5 py-0.5 md:py-1 rounded-lg text-[9px] md:text-[10px] font-bold bg-amber/15 text-amber border border-amber/20">KANJI FOCUS</span>
          <span className="px-2 md:px-2.5 py-0.5 md:py-1 rounded-lg text-[9px] md:text-[10px] font-bold bg-amber/10 text-amber">10 CARDS</span>
        </div>
      </div>
    </button>
  );
}
