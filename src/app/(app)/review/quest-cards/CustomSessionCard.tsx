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
      className="group relative flex items-center justify-center text-center rounded-3xl border-2 border-dashed border-border/60 bg-card/50 p-4 md:p-5 lg:p-6 transition-all hover:-translate-y-1 hover:shadow-lg hover:border-indigo-soft/60 hover:bg-indigo-soft/5 cursor-pointer shadow-sm overflow-hidden"
    >
      <div className="relative z-10">
        <div className="flex flex-col items-center gap-2 md:gap-3">
          <span className="flex h-11 w-11 md:h-12 md:w-12 lg:h-14 lg:w-14 items-center justify-center rounded-2xl bg-indigo-soft/10 text-2xl md:text-2xl lg:text-3xl group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300">
            ⚙️
          </span>
          <div>
            <h3 className="font-display text-sm md:text-base lg:text-lg font-extrabold text-foreground">Custom Session</h3>
            <p className="text-[10px] md:text-xs text-muted mt-0.5 md:mt-1">Build your own quest</p>
          </div>
        </div>
      </div>
    </button>
  );
}
