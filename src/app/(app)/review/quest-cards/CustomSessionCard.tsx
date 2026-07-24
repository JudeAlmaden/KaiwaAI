/**
 * Custom Session Card - Opens modal for custom configuration
 */

type CustomSessionCardProps = {
  onClick: () => void;
};

export default function CustomSessionCard({ onClick }: CustomSessionCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative w-full flex flex-col items-center justify-center text-center rounded-3xl border-2 border-dashed border-border/70 bg-card/40 p-6 md:p-7 transition-all hover:-translate-y-1 hover:shadow-lg hover:border-indigo-ai/50 hover:bg-indigo-ai/5 cursor-pointer overflow-hidden min-h-[160px]"
    >
      <div className="relative z-10 flex flex-col items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/15 text-2xl group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300">
          ⚙️
        </span>
        <div>
          <h3 className="font-display text-base font-extrabold text-foreground group-hover:text-indigo-ai transition-colors">
            Custom Session
          </h3>
          <p className="text-xs text-muted mt-0.5">Build your own quest</p>
        </div>
      </div>
    </button>
  );
}
