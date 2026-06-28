"use client";

import { useState } from "react";
import { lookupWord, type LookupResult } from "@/lib/gemini";
import { speakJa, canSpeak } from "@/lib/speak";

export default function LookupBox({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function search() {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);
    try {
      const r = await lookupWord(q);
      setResult(r);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Lookup failed.";
      if (msg === "NO_API_KEY") setError("Add a Gemini key in Settings first.");
      else if (msg === "BAD_API_KEY") setError("Your Gemini key was rejected.");
      else if (msg === "RATE_LIMIT") setError("Rate limited — try again in a moment.");
      else setError("Couldn't look that up. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function add() {
    if (!result) return;
    const res = await fetch("/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        word: {
          word: result.word,
          reading: result.reading,
          romaji: result.romaji,
          meaning: result.meaning,
          pos: result.pos,
        },
      }),
    });
    if (res.ok) {
      setSaved(true);
      onAdded();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Couldn't add that word.");
    }
  }

  if (!open) {
    return (
      <div className="px-5 pt-3 sm:px-8">
        <button
          onClick={() => setOpen(true)}
          className="mx-auto flex w-full max-w-3xl items-center gap-2 rounded-2xl border-2 border-dashed border-border px-4 py-2.5 text-sm font-bold text-muted transition-colors hover:border-indigo-ai hover:text-indigo-ai"
        >
          🔍 Look up a word to learn…
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 pt-3 sm:px-8">
      <div className="mx-auto max-w-3xl rounded-2xl border-2 border-indigo-ai/40 bg-card p-4">
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="A Japanese word, or English to translate…"
            className="h-11 flex-1 rounded-2xl border-2 border-border bg-card px-4 text-sm outline-none focus:border-indigo-ai"
          />
          <button
            onClick={search}
            disabled={loading || !query.trim()}
            className="rounded-2xl bg-indigo-ai px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-soft disabled:opacity-50"
          >
            {loading ? "…" : "Look up"}
          </button>
          <button
            onClick={() => {
              setOpen(false);
              setResult(null);
              setQuery("");
            }}
            className="text-sm font-bold text-muted hover:text-sakura"
          >
            ✕
          </button>
        </div>

        {error && <p className="mt-2 text-sm font-semibold text-sakura">{error}</p>}

        {result && (
          <div className="mt-4 rounded-2xl bg-indigo-ai/5 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-jp text-2xl font-bold">{result.word}</p>
                <p className="font-jp text-sm text-indigo-ai">{result.reading}</p>
                <p className="text-xs text-muted">{result.romaji}</p>
              </div>
              {canSpeak() && (
                <button
                  onClick={() => speakJa(result.word)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-ai/10 text-indigo-ai"
                >
                  🔊
                </button>
              )}
            </div>
            <p className="mt-2 font-semibold">{result.meaning}</p>
            <p className="mt-2 font-jp text-sm">{result.example}</p>
            <p className="text-xs text-muted">{result.exampleEn}</p>

            <div className="mt-3">
              {saved ? (
                <span className="text-sm font-bold text-mint">✓ Added to your deck</span>
              ) : (
                <button
                  onClick={add}
                  className="rounded-full bg-indigo-ai px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-indigo-soft"
                >
                  + Add to vocabulary
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
