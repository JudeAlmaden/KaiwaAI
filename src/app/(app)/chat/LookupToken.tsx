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
  const [errorKind, setErrorKind] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>("idle");
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  const btnRef = useRef<HTMLButtonElement>(null);
  const onToggleRef = useRef(onToggle);

  useEffect(() => {
    onToggleRef.current = onToggle;
  }, [onToggle]);

  useEffect(() => {
    if (!isOpen) return;

    const openedAt = performance.now();

    function handleClickOutside(e: Event) {
      if (performance.now() - openedAt < 80) return;
      const target = e.target as Node;
      if (popupRef.current?.contains(target)) return;
      if (btnRef.current?.contains(target)) return;
      onToggleRef.current();
    }

    const timer = setTimeout(() => {
      document.addEventListener("pointerdown", handleClickOutside, true);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerdown", handleClickOutside, true);
    };
  }, [isOpen]);

  async function open() {
    onToggle();
    if (result || loading) return;
    setLoading(true);
    setFailed(false);
    setErrorKind(null);
    try {
      setResult(await lookupWord(surface));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "RATE_LIMIT") setErrorKind("RATE_LIMIT");
      else if (msg === "BAD_API_KEY") setErrorKind("BAD_API_KEY");
      else if (msg === "NO_API_KEY") setErrorKind("NO_API_KEY");
      else setErrorKind("OTHER");
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
        ref={btnRef}
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
            <div className="block text-xs">
              {errorKind === "RATE_LIMIT" ? (
                <div className="text-amber">
                  Rate limit hit — try again in a moment.
                </div>
              ) : errorKind === "BAD_API_KEY" ? (
                <div className="text-sakura">
                  Invalid API key. Check Settings → API Keys.
                </div>
              ) : errorKind === "NO_API_KEY" ? (
                <div className="text-amber">
                  Add a Gemini key in Settings to look up words.
                </div>
              ) : (
                <div className="text-sakura">
                  Couldn&apos;t look that up. Tap again to retry.
                </div>
              )}
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
