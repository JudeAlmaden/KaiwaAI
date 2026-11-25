"use client";

import { patternLabel } from "@/lib/review/conjugation-patterns";
import {
  DIMENSION_LABELS,
  dimensionAccuracy,
  type PatternDimension,
  type PatternStats,
} from "@/lib/review/conjugation-mastery";

const DIMENSION_KEYS: PatternDimension[] = ["recognition", "construction", "application"];

export function PatternMasteryPanel({ patterns }: { patterns: PatternStats[] }) {
  if (patterns.length === 0) return null;

  return (
    <details className="rounded-2xl border border-border bg-card px-4 py-2.5 text-xs">
      <summary className="cursor-pointer font-bold text-muted">
        Pattern mastery · {patterns.length} tracked
      </summary>
      <ul className="mt-2 space-y-2">
        {patterns.map((item) => {
          const accuracy = Math.round((item.correct / item.attempts) * 100);
          return (
            <li
              key={item.pattern}
              className="space-y-1 border-t border-border/50 pt-1.5 first:border-t-0 first:pt-0"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-foreground">{patternLabel(item.pattern)}</span>
                <span className="text-muted">
                  {accuracy}% · {item.correct}/{item.attempts}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {DIMENSION_KEYS.map((dimension) => {
                  const value = dimensionAccuracy(item, dimension);
                  return (
                    <div key={dimension}>
                      <div className="flex justify-between gap-1 text-[10px]">
                        <span>{DIMENSION_LABELS[dimension]}</span>
                        <span>{value === null ? "—" : `${Math.round(value * 100)}%`}</span>
                      </div>
                      <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-border">
                        <div
                          className="h-1 rounded-full bg-indigo-ai"
                          style={{ width: `${value === null ? 0 : Math.round(value * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
