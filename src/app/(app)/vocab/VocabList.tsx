"use client";

import type { RefObject } from "react";
import { StatusBadge } from "../ui";
import LookupBox from "./LookupBox";
import { Ring } from "./VocabBits";
import { progressOf, type Card, type ContentTab, type Filter } from "./types";
import { canSpeak, speakJa } from "@/lib/speak";

export default function VocabList({
  groups,
  isEmpty,
  hasMore,
  totalFiltered,
  contentTab,
  query,
  filter,
  sentinelRef,
  onSelect,
  onAdded,
}: {
  groups: [string, Card[]][];
  isEmpty: boolean;
  hasMore: boolean;
  totalFiltered: number;
  contentTab: ContentTab;
  query: string;
  filter: Filter;
  sentinelRef: RefObject<HTMLDivElement | null>;
  onSelect: (card: Card) => void;
  onAdded: () => void;
}) {
  if (isEmpty) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-ai/10 text-4xl">
          📒
        </div>
        <h2 className="mt-4 font-display text-lg font-bold">
          {query || filter !== "All" ? "No matches" : "Your deck is empty"}
        </h2>
        <p className="mt-1 max-w-xs text-sm text-muted">
          {contentTab === "phrases"
            ? "Save phrases while chatting with Kai to collect them here."
            : "Tap words while chatting with Kai to collect them here."}
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-y-auto px-5 py-2 sm:px-8">
      <div className="mx-auto max-w-3xl">
        {groups.map(([pos, items]) => (
          <div key={pos} className="mb-6">
            <h3 className="mb-2.5 flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wide text-muted">
              {pos}
              <span className="rounded-full bg-border/50 px-2 py-0.5 text-[10px]">
                {items.length}
              </span>
            </h3>
            <div className="grid gap-2.5 sm:grid-cols-2 min-w-0">
              {items.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onSelect(c)}
                  className="group flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-border bg-card px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-indigo-soft hover:shadow-md hover:shadow-indigo-ai/5 min-w-0 max-w-full overflow-hidden"
                >
                  <Ring pct={progressOf(c)} />
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="flex items-baseline gap-2 min-w-0 overflow-hidden">
                      <p className="font-jp text-lg font-bold leading-tight shrink-0 max-w-[60%] truncate">
                        {c.word}
                      </p>
                      <p className="truncate font-jp text-xs text-indigo-ai/70 min-w-0 flex-1">
                        {c.reading}
                      </p>
                      {c.note && (
                        <span className="text-xs shrink-0" title="Has note">
                          📝
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted min-w-0 block">{c.meaning}</p>
                  </div>
                  {canSpeak() && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        speakJa(c.word);
                      }}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted/50 transition-colors hover:bg-indigo-ai/10 hover:text-indigo-ai"
                      aria-label="Hear it"
                    >
                      🔊
                    </button>
                  )}
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Infinite scroll sentinel */}
        {hasMore && (
          <div ref={sentinelRef} className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-ai border-t-transparent" />
          </div>
        )}

        {/* Show total when done loading */}
        {!hasMore && totalFiltered > 0 && (
          <div className="py-6 text-center text-sm text-muted">
            All {totalFiltered} {contentTab} loaded
          </div>
        )}
      </div>

      {/* FAB — add word from dictionary */}
      <div className="sticky bottom-4 flex justify-end pr-1 pt-2">
        <LookupBox onAdded={onAdded} />
      </div>
    </div>
  );
}
