"use client";

import { useState } from "react";
import Link from "next/link";
import { Brain } from "@phosphor-icons/react/dist/ssr";

/** Save a single memory for a persona (null = Kai/default tutor). */
export async function saveMemory(content: string, personaId: string | null) {
  await fetch("/api/memory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, personaId, category: "fact" }),
  }).catch(() => {});
}

/**
 * Shows durable facts the AI noticed this turn. In "propose" mode each is a
 * chip the user taps to save; in "auto" mode they're shown as already saved.
 */
export default function MemorySuggestions({
  suggestions,
  personaId,
  auto,
  onClear,
}: {
  suggestions: string[];
  personaId: string | null;
  auto: boolean;
  onClear: () => void;
}) {
  // Track per-item state: pending → saved.
  const [saved, setSaved] = useState<Set<string>>(
    () => new Set(auto ? suggestions : [])
  );

  if (suggestions.length === 0) return null;

  async function save(s: string) {
    setSaved((prev) => new Set(prev).add(s));
    await saveMemory(s, personaId);
  }

  return (
    <div className="mb-2 rounded-2xl border-2 border-indigo-ai/20 bg-indigo-ai/5 px-3 py-2.5">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Brain size={16} weight="duotone" className="text-indigo-ai" />
        <span className="text-xs font-bold text-indigo-ai">
          {auto ? "Saved to memory" : "Remember this?"}
        </span>
        <Link
          href="/memory"
          className="ml-auto text-[11px] font-bold text-indigo-ai/70 underline hover:text-indigo-ai"
        >
          View memory
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
        {suggestions.map((s) => {
          const isSaved = saved.has(s);
          return (
            <button
              key={s}
              onClick={() => !isSaved && save(s)}
              disabled={isSaved}
              className={`rounded-full border-2 px-3 py-1 text-xs font-bold transition-colors ${
                isSaved
                  ? "border-mint/40 bg-mint/10 text-mint"
                  : "border-border text-muted hover:border-indigo-ai hover:text-indigo-ai"
              }`}
            >
              {isSaved ? "✓ " : "+ "}
              {s}
            </button>
          );
        })}
      </div>
    </div>
  );
}
