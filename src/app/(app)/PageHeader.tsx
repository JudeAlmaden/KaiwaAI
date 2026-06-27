export default function PageHeader({
  title,
  jp,
  subtitle,
  action,
}: {
  title: string;
  jp?: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b-2 border-border px-5 py-4 sm:px-8">
      <div>
        <h1 className="flex items-baseline gap-2 font-display text-2xl font-extrabold tracking-tight">
          {title}
          {jp && <span className="font-jp text-base text-muted">{jp}</span>}
        </h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
