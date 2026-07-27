/**
 * Vocabulary Learning Card
 */

type VocabularyCardProps = {
  onStart: () => void;
};

export default function VocabularyCard({ onStart }: VocabularyCardProps) {
  return (
    <button
      onClick={onStart}
      className="group relative w-full flex flex-col justify-between text-left rounded-3xl border-2 border-border bg-gradient-to-br from-card to-sky/5 p-5 md:p-6 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-sky/15 hover:border-sky/40 cursor-pointer shadow-sm overflow-hidden min-h-[160px]"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-sky/0 via-sky/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="absolute -right-2 -bottom-4 text-[80px] font-bold font-jp text-sky/5 select-none pointer-events-none leading-none group-hover:text-sky/10 transition-colors duration-500">
        語
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky/15 text-2xl group-hover:scale-110 transition-transform duration-300">
            📚
          </span>
          <h3 className="font-display text-base md:text-lg font-extrabold text-foreground">Vocabulary</h3>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          Focused word study with bidirectional review.
        </p>
      </div>

      <div className="relative z-10 flex flex-wrap gap-1.5 mt-4">
        <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-sky/15 text-sky border border-sky/20">WORDS ONLY</span>
        <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-sky/10 text-sky">BOTH WAYS</span>
      </div>
    </button>
  );
}
