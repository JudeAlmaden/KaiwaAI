"use client";

import { useState, useEffect, useRef } from "react";
import { lookupWord, type LookupResult } from "@/lib/gemini";
import { type PartOfSpeech } from "@/lib/types";

type SaveState = "idle" | "saving" | "saved" | "exists";

/**
 * A tappable Japanese run for messages that arrived WITHOUT a cached tokens
 * array. On open it looks the word up on demand (BYOK) so tap-to-translate and
 * "add to review" still work — for any persona, not just Kai.
 */
export default function LookupToken({
  surface,
  isOpen,
  onToggle,
}: {
  surface: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [save, setSave] = useState<SaveState>("idle");
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onToggle(); // Close the popup
      }
    }

    // Add slight delay to prevent immediate closing when opening
    setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onToggle]);

  async function open() {
    onToggle();
    if (result || loading) return;
    setLoading(true);
    setFailed(false);
    try {
      setResult(await lookupWord(surface));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  async function add() {
    if (!result) return;
    setSave("saving");
    const token = {
      surface,
      reading: result.reading,
      romaji: result.romaji,
      meaning: result.meaning,
      pos: (result.pos as PartOfSpeech) ?? "other",
      dictForm: result.word || surface,
    };
    const res = await fetch("/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (res.ok) {
      const d = await res.json();
      setSave(d.alreadyExisted ? "exists" : "saved");
    } else {
      setSave("idle");
    }
  }

  return (
    <span className="relative inline-block">
      <button
        onClick={open}
        className={`rounded decoration-2 underline-offset-4 transition-colors ${
          isOpen
            ? "bg-indigo-ai/15 text-indigo-ai"
            : "underline decoration-indigo-ai/25 hover:bg-indigo-ai/10"
        }`}
      >
        {surface}
      </button>

      {isOpen && (
        <div
          ref={popupRef}
          className="absolute bottom-full left-1/2 z-20 mb-2 block w-48 -translate-x-1/2 rounded-2xl border-2 border-border bg-card p-3 text-left shadow-xl"
        >
          {loading && <div className="block text-xs text-muted">Looking up…</div>}
          {failed && (
            <div className="block text-xs text-sakura">
              Couldn&apos;t look that up. Tap again to retry.
            </div>
          )}
          {result && (
            <>
              <div className="block font-jp text-base font-bold text-foreground">
                {result.reading}
              </div>
              <div className="block text-xs text-muted">{result.romaji}</div>
              <div className="mt-1 block text-sm font-semibold text-indigo-ai">
                {result.meaning}
              </div>
              <div className="mt-0.5 block text-[10px] uppercase tracking-wide text-muted">
                {result.pos}
              </div>
              <div className="mt-2 block">
                {save === "saved" || save === "exists" ? (
                  <div className="flex items-center gap-1 text-xs font-bold text-mint">
                    ✓ in your review deck
                  </div>
                ) : (
                  <button
                    onClick={add}
                    disabled={save === "saving"}
                    className="w-full rounded-full bg-indigo-ai px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-indigo-soft disabled:opacity-60"
                  >
                    {save === "saving" ? "Adding…" : "+ Add to vocabulary"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </span>
  );
}
