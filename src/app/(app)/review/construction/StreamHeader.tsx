"use client";

import type { GrammarConcept } from "@/lib/grammar/curriculum";
import { ResetSittingButton, SittingStats } from "../components/SittingBar";
import type { Sitting } from "../hooks/useSitting";

type StreamHeaderProps = {
  concept: GrammarConcept;
  moduleTitle: string;
  moduleJp: string;
  sitting: Sitting;
  focusTitle: string | null;
  onAdaptive: () => void;
  onFocusConcept: (conceptId: string) => void;
  onEndSitting: () => void;
};

/**
 * Topic context and the sitting counters in one card: what is being practised,
 * how the sitting is going, and the two actions that change either.
 */
export function StreamHeader({
  concept,
  moduleTitle,
  moduleJp,
  sitting,
  focusTitle,
  onAdaptive,
  onFocusConcept,
  onEndSitting,
}: StreamHeaderProps) {
  return (
    <div className="rounded-2xl border-2 border-border bg-card px-4 py-3">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-sky">
        {moduleTitle} · {moduleJp}
      </p>
      <p className="mt-1 text-sm font-extrabold text-foreground">
        {concept.title}
        <span className="ml-1.5 font-jp text-xs font-normal text-muted">{concept.jp}</span>
      </p>
      <p className="mt-0.5 text-[11px] text-muted">{concept.goal}</p>
      <details className="mt-2 text-[11px] text-muted">
        <summary className="cursor-pointer font-bold text-muted">What this teaches</summary>
        <ul className="mt-1 space-y-0.5">
          {concept.teaches.map((line) => (
            <li key={line}>· {line}</li>
          ))}
        </ul>
      </details>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2">
        <SittingStats answered={sitting.total} right={sitting.right} streak={sitting.streak} tone="sky">
          {focusTitle ? (
            <>
              <span className="rounded-lg bg-sky/10 px-2 py-0.5 text-[10px] font-extrabold text-sky">
                Focus: {focusTitle}
              </span>
              <button
                type="button"
                onClick={onAdaptive}
                className="rounded-lg border border-border px-2 py-0.5 text-[10px] font-bold text-muted transition hover:text-foreground"
              >
                Back to adaptive
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onFocusConcept(concept.id)}
              className="rounded-lg border border-border px-2 py-0.5 text-[10px] font-bold text-muted transition hover:text-foreground"
            >
              Focus this topic
            </button>
          )}
        </SittingStats>
        {sitting.total > 0 && <ResetSittingButton onClick={onEndSitting} />}
      </div>
    </div>
  );
}
