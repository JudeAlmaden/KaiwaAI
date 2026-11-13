"use client";

import { useEffect, useState } from "react";
import type { CoverageBucket } from "@/lib/kanji-coverage";

type CoverageResponse = {
  levels: CoverageBucket[];
  totals: { total: number; known: number; learning: number };
};

const CELL_CLASS: Record<string, string> = {
  known: "border-mint/40 bg-mint/20 text-mint",
  learning: "border-indigo-ai/30 bg-indigo-ai/15 text-indigo-ai",
  new: "border-dashed border-indigo-ai/30 bg-surface text-muted",
  untouched: "border-transparent text-muted/25",
};

const LEGEND = [
  { key: "known", label: "Mastered" },
  { key: "learning", label: "Learning" },
  { key: "new", label: "Added" },
  { key: "untouched", label: "Not yet" },
];

export default function KanjiCoverageGrid() {
  const [data, setData] = useState<CoverageResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/kanji/coverage");
        if (!res.ok) throw new Error(`coverage ${res.status}`);
        const json = (await res.json()) as CoverageResponse;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-12 text-center">
        <p className="text-sm font-semibold text-fg">Couldn&apos;t load your coverage</p>
        <p className="mt-1 text-xs text-muted">Check your connection and try again.</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-indigo-ai" />
        <p className="text-xs text-muted">Mapping your kanji…</p>
      </div>
    );
  }

  const { totals } = data;
  const started = totals.known + totals.learning;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/80 bg-card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-fg">Kanji Coverage</h2>
          <p className="text-xs font-medium text-muted">
            {totals.known} mastered · {started} in your deck · {totals.total} total
          </p>
        </div>
        <p className="mt-1 text-xs text-muted">
          Your footprint across the language — every JLPT kanji, lit up as you learn it.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          {LEGEND.map((item) => (
            <span key={item.key} className="flex items-center gap-1.5 text-[11px] text-muted">
              <span className={`h-3 w-3 rounded-sm border ${CELL_CLASS[item.key]}`} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {data.levels.map((bucket) => {
        if (bucket.total === 0) return null;
        const pct = Math.round((bucket.known / bucket.total) * 100);

        return (
          <section
            key={bucket.level}
            className="rounded-2xl border border-border/80 bg-card p-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <h3 className="font-display text-sm font-bold text-fg">{bucket.level}</h3>
                <span className="text-[11px] text-muted">
                  {bucket.known} / {bucket.total} mastered
                </span>
              </div>
              <span className="text-[11px] font-semibold text-indigo-ai">{pct}%</span>
            </div>

            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border/60">
              <div
                className="h-full rounded-full bg-mint transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(26px,1fr))] gap-1">
              {bucket.cells.map((cell) => (
                <span
                  key={cell.character}
                  title={`${cell.character} · ${cell.status ?? "not in your deck"}`}
                  className={`flex aspect-square items-center justify-center rounded-md border font-jp text-[13px] leading-none ${
                    CELL_CLASS[cell.status ?? "untouched"]
                  }`}
                >
                  {cell.character}
                </span>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
