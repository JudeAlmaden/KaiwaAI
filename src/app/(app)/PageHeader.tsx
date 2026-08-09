export default function PageHeader({
  title,
  jp,
  subtitle,
  bar,
  action,
}: {
  title: string;
  jp?: string;
  subtitle?: string;
  /** Optional inline progress bar element rendered under the subtitle. */
  bar?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b-2 border-border px-5 py-4 sm:px-8">
      <div className="flex-1 min-w-0">
        <h1 className="flex items-baseline gap-2 font-display text-2xl font-extrabold tracking-tight">
          {title}
          {jp && <span className="font-jp text-base text-muted">{jp}</span>}
        </h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        {bar && <div className="mt-2">{bar}</div>}
      </div>
      {action}
    </div>
  );
}
