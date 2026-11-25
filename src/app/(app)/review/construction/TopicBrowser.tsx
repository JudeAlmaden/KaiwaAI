"use client";

import { CONCEPTS, CONCEPT_BY_ID, MODULES, conceptsForModule } from "@/lib/grammar/curriculum";
import { accuracyOf, type ConceptStats } from "@/lib/grammar/mastery";
import { relativeTime } from "./relativeTime";

type TopicBrowserProps = {
  stats: Record<string, ConceptStats>;
  focus: string | null;
  onFocus: (conceptId: string | null) => void;
};

export function TopicBrowser({ stats, focus, onFocus }: TopicBrowserProps) {
  const practicedCount = CONCEPTS.filter((concept) => (stats[concept.id]?.attempts ?? 0) > 0).length;
  const focused = focus ? CONCEPT_BY_ID.get(focus) ?? null : null;
  const focusedStats = focus ? stats[focus] : undefined;

  return (
    <details className="rounded-2xl border border-border bg-card px-4 py-2.5 text-xs">
      <summary className="cursor-pointer font-bold text-muted">
        Topics · {practicedCount}/{CONCEPTS.length} practiced
      </summary>
      <p className="mt-2 text-[10px] text-muted">
        Every topic is open. Pick one to narrow the stream, or leave it adaptive and let your
        weakest grammar decide.
      </p>

      <div className="mt-2 space-y-3">
        {MODULES.map((moduleItem) => (
          <div key={moduleItem.id}>
            <p className="font-bold text-foreground">
              {moduleItem.title}
              <span className="ml-1.5 font-jp text-[11px] font-normal text-muted">
                {moduleItem.jp}
              </span>
            </p>
            <div className="mt-1.5 grid gap-1 sm:grid-cols-2">
              {conceptsForModule(moduleItem.id).map((item) => {
                const itemStats = stats[item.id];
                const selected = focus === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={selected}
                    title={item.goal}
                    onClick={() => onFocus(item.id)}
                    className={`rounded-xl border-2 px-3 py-2 text-left transition ${
                      selected
                        ? "border-sky bg-sky/10"
                        : "border-border bg-card hover:border-sky/40 hover:bg-sky/5"
                    }`}
                  >
                    <span className="flex items-center gap-1 text-[11px] font-extrabold text-foreground">
                      {item.title}
                    </span>
                    <span className="block text-[10px] font-bold text-muted">
                      {itemStats && itemStats.attempts > 0
                        ? `${Math.round(accuracyOf(itemStats) * 100)}% · ${itemStats.attempts} tries · ${relativeTime(itemStats.dueAt)}`
                        : "Not practiced yet"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {focused && (
        <div className="mt-3 rounded-xl border-2 border-sky/30 bg-sky/5 p-3">
          <p className="text-[11px] font-extrabold text-foreground">
            {focused.title}
            <span className="ml-1.5 font-jp text-[11px] font-normal text-muted">{focused.jp}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-muted">{focused.goal}</p>
          <ul className="mt-1.5 space-y-0.5 text-[11px] text-muted">
            {focused.teaches.map((line) => (
              <li key={line}>· {line}</li>
            ))}
          </ul>
          <dl className="mt-2 grid grid-cols-2 gap-1 text-[10px] sm:grid-cols-5">
            {[
              [
                "Accuracy",
                focusedStats && focusedStats.attempts > 0
                  ? `${Math.round(accuracyOf(focusedStats) * 100)}%`
                  : "—",
              ],
              ["Attempts", String(focusedStats?.attempts ?? 0)],
              ["Streak", String(focusedStats?.streak ?? 0)],
              ["Last practiced", relativeTime(focusedStats?.lastPracticed)],
              ["Next due", relativeTime(focusedStats?.dueAt)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="font-bold text-muted">{label}</dt>
                <dd className="text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
          <button
            type="button"
            onClick={() => onFocus(null)}
            className="mt-2 rounded-xl bg-sky px-3 py-1.5 text-[11px] font-extrabold text-white"
          >
            Back to adaptive stream
          </button>
        </div>
      )}
    </details>
  );
}
