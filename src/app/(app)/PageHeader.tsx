export default function PageHeader({
  title,
  jp,
  subtitle,
  bar,
  action,
  compact = false,
}: {
  title: string;
  jp?: string;
  subtitle?: string;
  /** Optional inline progress bar element rendered under the subtitle. */
  bar?: React.ReactNode;
  action?: React.ReactNode;
  /** Tighter mobile chrome — hide jp/subtitle below sm. */
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-end justify-between gap-4 border-b-2 border-border px-5 sm:px-8 ${
        compact ? "py-2.5 sm:py-4" : "py-4"
      }`}
    >
      <div className="flex-1 min-w-0">
        <h1 className="flex items-baseline gap-2 font-display text-xl font-extrabold tracking-tight sm:text-2xl">
          {title}
          {jp && (
            <span
              className={`font-jp text-base text-muted ${compact ? "hidden sm:inline" : ""}`}
            >
              {jp}
            </span>
          )}
        </h1>
        {subtitle && (
          <p
            className={`mt-0.5 text-sm text-muted ${compact ? "hidden sm:block" : ""}`}
          >
            {subtitle}
          </p>
        )}
        {bar && <div className="mt-2">{bar}</div>}
      </div>
      {action}
    </div>
  );
}
