import type { ReactNode } from "react";

type Tone = "sky" | "mint";

const TONE = {
  sky: { text: "text-sky", bar: "bg-sky" },
  mint: { text: "text-mint", bar: "bg-mint" },
} as const;

type SittingStatsProps = {
  /** Exercises answered in this sitting. */
  answered: number;
  right: number;
  streak: number;
  tone: Tone;
  children?: ReactNode;
};

/**
 * Counters for the current sitting. An endless stream has no target, so this
 * reports answers and accuracy rather than a fraction, and stays quiet until
 * the first answer — a "0/0" bar on a fresh page says nothing.
 */
export function SittingStats({ answered, right, streak, tone, children }: SittingStatsProps) {
  const colors = TONE[tone];
  const accuracy = answered > 0 ? Math.round((right / answered) * 100) : 0;

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-muted">
      <span>
        {answered === 0 ? (
          "New sitting"
        ) : (
          <>
            {answered} answered <span className="ml-0.5">· {accuracy}%</span>
          </>
        )}
      </span>
      {answered > 0 && (
        <>
          <span
            className="h-1.5 w-12 overflow-hidden rounded-full bg-border"
            aria-hidden="true"
          >
            <span
              className={`block h-1.5 rounded-full ${colors.bar}`}
              style={{ width: `${accuracy}%` }}
            />
          </span>
          <span>
            Streak <span className={streak > 0 ? colors.text : "text-foreground"}>{streak}</span>
          </span>
        </>
      )}
      {children}
    </div>
  );
}

/** Reset is only offered once there is something to reset. */
export function ResetSittingButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border-2 border-border px-3 py-1.5 text-xs font-bold text-muted transition hover:text-foreground"
    >
      Reset sitting
    </button>
  );
}

type SittingBarProps = {
  answered: number;
  right: number;
  streak: number;
  tone: Tone;
  onReset: () => void;
  /** Actions for the end of the row, e.g. Skip. */
  action?: ReactNode;
  children?: ReactNode;
};

/** The stats row as its own card, for screens that don't have a topic header. */
export function SittingBar({
  answered,
  right,
  streak,
  tone,
  onReset,
  action,
  children,
}: SittingBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-border bg-card px-4 py-2.5">
      <SittingStats answered={answered} right={right} streak={streak} tone={tone}>
        {children}
      </SittingStats>
      <div className="flex items-center gap-2">
        {action}
        {answered > 0 && <ResetSittingButton onClick={onReset} />}
      </div>
    </div>
  );
}
