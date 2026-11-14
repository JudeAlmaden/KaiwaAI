"use client";

import { useState } from "react";
import type { ActiveQuestState } from "@/lib/quests";

/** Collapsed quest progress; expand to see objective chips. */
export default function QuestStrip({ state }: { state: ActiveQuestState }) {
  const [open, setOpen] = useState(false);
  const done = state.completedObjectiveIds.length;
  const total = state.quest.objectives.length;
  return (
    <div className="border-b-2 border-indigo-ai/20 bg-indigo-ai/5 px-5 py-2 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-2 text-left"
        >
          <p className="min-w-0 flex-1 truncate text-xs font-extrabold text-indigo-ai">
            {state.quest.emoji} {state.quest.title}
          </p>
          <span className="shrink-0 text-xs text-muted">
            {done}/{total}
          </span>
          <span className="text-muted" aria-hidden>
            {open ? "▴" : "▾"}
          </span>
        </button>
        {open && (
          <div className="mt-2 flex flex-wrap gap-2">
            {state.quest.objectives.map((obj) => {
              const isDone = state.completedObjectiveIds.includes(obj.id);
              return (
                <div
                  key={obj.id}
                  title={isDone ? obj.description : `Hint: ${obj.jpHint}`}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    isDone
                      ? "bg-mint/20 text-mint line-through opacity-60"
                      : "bg-indigo-ai/10 text-indigo-ai"
                  }`}
                >
                  <span>{isDone ? "✅" : "⬜"}</span>
                  <span>{obj.description}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
