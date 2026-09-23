const STATS = [
  { value: "100%", label: "Free forever", color: "text-foreground" },
  { value: "Available on", label: "PC & Android", color: "text-indigo-ai" },
  { value: "N5 → N1", label: "Learn Kanji and vocab", color: "text-foreground" },
  { value: "SRS", label: "Spaced Repetition System", color: "text-mint" },
];

export default function LandingStatsTicker() {
  return (
    <section className="relative z-10 border-y border-border bg-card/80">
      <div className="mx-auto grid w-full grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
        {STATS.map((stat) => (
          <div key={stat.label} className="px-3 py-5 text-center sm:px-5 sm:py-6 2xl:py-5">
            <p className={`font-display text-2xl font-extrabold tracking-tight sm:text-3xl 2xl:text-[2.65rem] ${stat.color}`}>
              {stat.value}
            </p>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-muted sm:text-[10px] 2xl:text-xs">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
