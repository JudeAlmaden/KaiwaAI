"use client";

import { useState } from "react";
import Link from "next/link";
import { Brain } from "@phosphor-icons/react/dist/ssr";
import type { MemorySuggestion } from "@/lib/types";
import { cleanMemorySuggestion } from "@/lib/gemini";

const CATEGORY_EMOJI: Record<string, string> = {
  profile: "🙂",
  preference: "💜",
  fact: "📌",
  goal: "🎯",
  relationship: "🤝",
};

/** Save a single memory for a persona (null = Kai/default tutor). */
export async function saveMemory(
  suggestion: MemorySuggestion | string,
  personaId: string | null
) {
  const payload =
    typeof suggestion === "string"
      ? {
          content: cleanMemorySuggestion(suggestion),
          personaId,
          category: "fact",
          importance: 1,
        }
      : {
          content: cleanMemorySuggestion(suggestion.content),
          personaId,
          category: suggestion.category,
          importance: suggestion.importance,
        };
  await fetch("/api/memory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

/**
 * Shows durable facts the AI noticed this turn. Collapses to a single pill
 * so the composer stays usable; expands on tap.
 */
export default function MemorySuggestions({
  suggestions,
  personaId,
  auto,
  onClear,
}: {
  suggestions: Array<MemorySuggestion | string>;
  personaId: string | null;
  auto: boolean;
  onClear: () => void;
}) {
  const normalized: MemorySuggestion[] = suggestions
    .map((s) =>
      typeof s === "string"
        ? { content: cleanMemorySuggestion(s), category: "fact" as const, importance: 1 }
        : { ...s, content: cleanMemorySuggestion(s.content) }
    )
    .filter((s) => s.content.length > 0);

  const [saved, setSaved] = useState<Set<number>>(
    () => new Set(auto ? normalized.map((_, i) => i) : [])
  );
  const [expanded, setExpanded] = useState(!auto && normalized.length <= 2);

  if (normalized.length === 0) return null;

  const pending = normalized.length - saved.size;
  const memoryHref = personaId
    ? `/memory?persona=${encodeURIComponent(personaId)}`
    : "/memory";

  async function save(i: number) {
    setSaved((prev) => new Set(prev).add(i));
    await saveMemory(normalized[i], personaId);
  }

  async function saveAll() {
    for (let i = 0; i < normalized.length; i++) {
      if (!saved.has(i)) await save(i);
    }
  }

  if (!expanded) {
    return (
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-full border-2 border-indigo-ai/25 bg-indigo-ai/5 px-3 py-1.5 text-left text-xs font-bold text-indigo-ai hover:border-indigo-ai/50"
        >
          <Brain size={14} weight="duotone" className="shrink-0" />
          <span className="truncate">
            {auto
              ? `Saved ${normalized.length} to memory`
              : `Remember ${pending || normalized.length}?`}
          </span>
        </button>
        <button
          onClick={onClear}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted/60 hover:bg-border hover:text-foreground"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="mb-2 rounded-2xl border-2 border-indigo-ai/20 bg-indigo-ai/5 px-3 py-2.5">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Brain size={16} weight="duotone" className="text-indigo-ai" />
        <span className="text-xs font-bold text-indigo-ai">
          {auto ? "Saved to memory" : "Remember this?"}
        </span>
        {!auto && pending > 1 && (
          <button
            type="button"
            onClick={saveAll}
            className="text-[11px] font-bold text-indigo-ai/80 underline hover:text-indigo-ai"
          >
            Save all
          </button>
        )}
        <Link
          href={memoryHref}
          className="ml-auto text-[11px] font-bold text-indigo-ai/70 underline hover:text-indigo-ai"
        >
          View diary
        </Link>
        <button
          onClick={onClear}
          className="text-muted/60 hover:text-foreground"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {normalized.map((s, i) => {
          const isSaved = saved.has(i);
          const emoji = CATEGORY_EMOJI[s.category] ?? "📌";
          return (
            <button
              key={`${i}-${s.content.slice(0, 24)}`}
              onClick={() => !isSaved && save(i)}
              disabled={isSaved}
              className={`rounded-full border-2 px-3 py-1 text-xs font-bold transition-colors ${
                isSaved
                  ? "border-mint/40 bg-mint/10 text-mint"
                  : "border-border text-muted hover:border-indigo-ai hover:text-indigo-ai"
              }`}
            >
              {isSaved ? "✓ " : "+ "}
              {emoji} {s.content}
            </button>
          );
        })}
      </div>
      {!auto && (
        <p className="mt-1.5 text-[10px] font-semibold text-muted">
          💡 Auto-save memories automatically from{" "}
          <Link href="/settings" className="underline font-bold text-indigo-ai hover:text-indigo-soft">
            Settings
          </Link>
        </p>
      )}
    </div>
  );
}
