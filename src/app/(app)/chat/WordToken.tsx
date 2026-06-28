"use client";

import { useState } from "react";
import { type CachedToken } from "@/lib/types";

type SaveState = "idle" | "saving" | "saved" | "exists";

const JP_CHAR = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;

/** Only Japanese-bearing tokens are worth a popup; punctuation/plain English
 *  (pos "other" with no kana/kanji) is rendered as plain text. */
export function isTappable(token: CachedToken): boolean {
  return JP_CHAR.test(token.surface);
}

export default function WordToken({
  token,
  sourceMessageId,
  savedWords,
  onSaved,
  isOpen,
  onToggle,
}: {
  token: CachedToken;
  sourceMessageId?: string;
  savedWords: Set<string>;
  onSaved: (word: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [state, setState] = useState<SaveState>("idle");

  // Non-Japanese tokens (punctuation, English words) render as plain text.
  if (!isTappable(token)) {
    return <span>{token.surface}</span>;
  }

  const alreadySaved = savedWords.has(token.dictForm) || state === "saved";

  async function add() {
    setState("saving");
    const res = await fetch("/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, sourceMessageId }),
    });
    if (res.ok) {
      const data = await res.json();
      setState(data.alreadyExisted ? "exists" : "saved");
      onSaved(token.dictForm);
    } else {
      setState("idle");
    }
  }

  return (
    <span className="relative inline-block">
      <button
        onClick={onToggle}
        className={`rounded decoration-2 underline-offset-4 transition-colors ${
          isOpen
            ? "bg-indigo-ai/15 text-indigo-ai"
            : alreadySaved
              ? "underline decoration-mint/50 hover:bg-mint/10"
              : "underline decoration-indigo-ai/25 hover:bg-indigo-ai/10"
        }`}
      >
        {token.surface}
      </button>

      {isOpen && (
        <span className="absolute bottom-full left-1/2 z-20 mb-2 block w-48 -translate-x-1/2 rounded-2xl border-2 border-border bg-card p-3 text-left shadow-xl">
          <span className="block font-jp text-base font-bold text-foreground">
            {token.reading}
          </span>
          <span className="block text-xs text-muted">{token.romaji}</span>
          <span className="mt-1 block text-sm font-semibold text-indigo-ai">
            {token.meaning}
          </span>
          <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-muted">
            {token.pos}
          </span>

          <span className="mt-2 block">
            {alreadySaved || state === "exists" ? (
              <span className="flex items-center gap-1 text-xs font-bold text-mint">
                ✓ in your review deck
              </span>
            ) : (
              <button
                onClick={add}
                disabled={state === "saving"}
                className="w-full rounded-full bg-indigo-ai px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-indigo-soft disabled:opacity-60"
              >
                {state === "saving" ? "Adding…" : "+ Add to review"}
              </button>
            )}
          </span>
        </span>
      )}
    </span>
  );
}
