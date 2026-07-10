"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { type CachedToken } from "@/lib/types";
import KanjiBreakdown from "./KanjiBreakdown";

type SaveState = "idle" | "saving" | "saved" | "exists" | "merged";

const JP_CHAR = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;

export function isTappable(token: CachedToken): boolean {
  return JP_CHAR.test(token.surface);
}

type WordLookupResult =
  | {
      type: "word";
      word: {
        id: number;
        dictionary: string;
        reading: string;
        meanings: string[];
        partOfSpeech: string;
        jlptLevel: string | null;
      };
      forms: Array<{
        id: string;
        form: string;
        reading: string;
        formType: string;
        saved: boolean;
      }>;
      userHasBaseWord: boolean;
    }
  | {
      type: "phrase";
      phrase: {
        id: string;
        text: string;
        reading: string;
        meanings: string[];
        partOfSpeech: string;
        source: string;
        verified: boolean;
      };
      saved: boolean;
    };

// ── Popup positioning ─────────────────────────────────────────────────────────
//
// We portal the popup to document.body so it's never clipped by overflow:hidden
// ancestors and `position:fixed` is always relative to the true viewport (no
// CSS-transform ancestor interference).
//
// Layout: popup sits ABOVE the anchor word.
//   bottom = window.innerHeight - rect.top + GAP   →  popup's bottom edge lines
//   up just above the word. No need to know popup height.
//
// Horizontal: centred on the anchor, clamped to viewport.

const POPUP_W = 340;
const GAP = 8;
const EDGE = 12;

interface PopupPos {
  bottom: number;
  left: number;
}

function calcPos(anchor: HTMLElement): PopupPos {
  const r = anchor.getBoundingClientRect();
  const vw = window.innerWidth;
  const bottom = window.innerHeight - r.top + GAP;
  let left = r.left + r.width / 2 - POPUP_W / 2;
  left = Math.max(EDGE, Math.min(left, vw - POPUP_W - EDGE));
  return { bottom, left };
}

// ── Portal wrapper ────────────────────────────────────────────────────────────

function PopupPortal({
  pos,
  children,
  onClose,
}: {
  pos: PopupPos;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    const t = setTimeout(() => document.addEventListener("mousedown", handle), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handle);
    };
  }, [onClose]);

  const el = (
    <div
      ref={ref}
      style={{
        position: "fixed",
        bottom: pos.bottom,
        left: pos.left,
        width: POPUP_W,
        maxHeight: "min(440px, 70vh)",
        zIndex: 9999,
        overflowY: "auto",
      }}
      className="rounded-2xl border-2 border-border bg-card shadow-2xl text-left"
    >
      {children}
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(el, document.body);
}

// ── Sub-word chip (inside phrase popup) ───────────────────────────────────────

function SubWordChip({
  token,
  savedWords,
  onSaved,
}: {
  token: CachedToken;
  savedWords: Set<string>;
  onSaved: (w: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<PopupPos | null>(null);

  const openChip = useCallback(() => {
    if (btnRef.current) setPos(calcPos(btnRef.current));
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onScroll() {
      if (btnRef.current) setPos(calcPos(btnRef.current));
    }
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  if (!isTappable(token))
    return <span className="text-sm font-jp">{token.surface}</span>;

  return (
    <span className="relative inline-block">
      <button
        ref={btnRef}
        onClick={() => (open ? setOpen(false) : openChip())}
        className={`rounded px-1.5 py-0.5 text-sm font-jp border transition-colors ${
          open
            ? "border-indigo-ai bg-indigo-ai/15 text-indigo-ai"
            : "border-border bg-surface/50 text-foreground hover:border-indigo-ai/40 hover:bg-indigo-ai/10"
        }`}
      >
        {token.surface}
      </button>

      {open && pos && (
        <PopupPortal pos={pos} onClose={() => setOpen(false)}>
          <div className="p-3">
            <div className="font-jp text-base font-bold">{token.surface}</div>
            {token.reading !== token.surface && (
              <div className="text-xs text-muted">{token.reading}</div>
            )}
            <div className="mt-0.5 text-xs text-muted italic">{token.romaji}</div>
            <div className="mt-1 text-sm font-semibold text-indigo-ai">{token.meaning}</div>
            <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted">{token.pos}</div>
            <div className="mt-2">
              <WordTokenBody token={token} savedWords={savedWords} onSaved={onSaved} compact />
            </div>
          </div>
        </PopupPortal>
      )}
    </span>
  );
}

// ── Shared body: dictionary + add-to-deck button ──────────────────────────────

function WordTokenBody({
  token,
  savedWords,
  onSaved,
  compact = false,
}: {
  token: CachedToken;
  savedWords: Set<string>;
  onSaved: (w: string) => void;
  compact?: boolean;
}) {
  const [state, setState] = useState<SaveState>("idle");
  const [lookupResult, setLookupResult] = useState<WordLookupResult | null>(null);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lookupResult || loading || lookupFailed) return;
    setTimeout(() => setLoading(true), 0);
    const params = new URLSearchParams({ dictForm: token.dictForm });
    params.set(
      "metadata",
      JSON.stringify({ reading: token.reading, meaning: token.meaning, pos: token.pos })
    );
    fetch(`/api/dictionary/lookup?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((d: WordLookupResult) => {
        setLookupResult(d);
        setLookupFailed(false);
      })
      .catch(() => setLookupFailed(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alreadySaved =
    savedWords.has(token.dictForm) ||
    state === "saved" ||
    state === "exists" ||
    state === "merged";

  async function addQuick() {
    setState("saving");
    const res = await fetch("/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
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
    <>
      {loading && <div className="text-xs text-muted">Loading dictionary…</div>}

      {lookupFailed && (
        <div className="rounded-lg bg-amber/10 px-2 py-1.5 text-xs text-amber">
          Not in dictionary yet. We&apos;ll add it soon!
        </div>
      )}

      {lookupResult && (
        <div className={compact ? "" : "mt-3 border-t border-border pt-2"}>
          {!compact && <div className="text-xs font-bold text-muted mb-1">Dictionary entry</div>}
          <div className="text-sm">
            <span className="font-jp font-bold">
              {lookupResult.type === "word" ? lookupResult.word.dictionary : lookupResult.phrase.text}
            </span>
            {lookupResult.type === "word" && lookupResult.word.jlptLevel && (
              <span className="ml-2 rounded bg-indigo-ai/10 px-1.5 py-0.5 text-[10px] font-bold text-indigo-ai">
                {lookupResult.word.jlptLevel}
              </span>
            )}
            {lookupResult.type === "phrase" && (
              <span className="ml-2 rounded bg-sakura/10 px-1.5 py-0.5 text-[10px] font-bold text-sakura">
                {lookupResult.phrase.source === "ai_lookup" ? "AI" : 
                 lookupResult.phrase.source === "user_created" ? "Custom" : "Phrase"}
              </span>
            )}
          </div>
          <div className="mt-1 space-y-0.5 text-xs text-muted">
            {(lookupResult.type === "word" ? lookupResult.word.meanings : lookupResult.phrase.meanings).map((m, i) => (
              <div key={i}>• {m}</div>
            ))}
          </div>

          {lookupResult.type === "word" && lookupResult.forms.length > 1 && (
            <div className="mt-2">
              <div className="text-xs font-bold text-muted">Common forms</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {lookupResult.forms.slice(0, 6).map((form) => (
                  <span
                    key={form.id}
                    className={`rounded-full px-2 py-0.5 text-xs font-jp ${
                      form.saved ? "bg-mint/20 text-mint" : "bg-border/50 text-muted"
                    }`}
                  >
                    {form.form}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!compact && <KanjiBreakdown word={token.dictForm} />}

      <div className="mt-2">
        {alreadySaved ? (
          <div className="flex items-center gap-1 text-xs font-bold text-mint">
            ✓ in your review deck
          </div>
        ) : (
          <button
            onClick={addQuick}
            disabled={state === "saving"}
            className="w-full rounded-full bg-indigo-ai px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-indigo-soft disabled:opacity-60"
          >
            {state === "saving" ? "Adding…" : "+ Add to vocabulary"}
          </button>
        )}
      </div>
    </>
  );
}

// ── Main exported token ───────────────────────────────────────────────────────

export default function WordToken({
  token,
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
  vocabLoaded?: boolean;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<PopupPos | null>(null);

  // Recalculate position whenever the popup opens
  useEffect(() => {
    if (isOpen && btnRef.current) {
      setPos(calcPos(btnRef.current));
    } else if (!isOpen) {
      setPos(null);
    }
  }, [isOpen]);

  // Keep position in sync while popup is open
  useEffect(() => {
    if (!isOpen) return;
    function update() {
      if (btnRef.current) setPos(calcPos(btnRef.current));
    }
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [isOpen]);

  if (!isTappable(token)) return <span>{token.surface}</span>;

  const isPhrase = token.pos === "phrase" && token.words && token.words.length > 0;
  const alreadySaved = savedWords.has(token.dictForm);

  return (
    <span className="relative inline-block">
      <button
        ref={btnRef}
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

      {isOpen && pos && (
        <PopupPortal pos={pos} onClose={onToggle}>
          <div className="p-4">
            {/* Header */}
            <div className="font-jp text-lg font-bold text-foreground leading-tight">
              {token.reading}
            </div>
            <div className="text-xs text-muted mt-0.5">{token.romaji}</div>
            <div className="mt-1.5 text-sm font-semibold text-indigo-ai">{token.meaning}</div>
            <div className="mt-0.5 text-[10px] uppercase tracking-widest text-muted">
              {token.pos}
            </div>

            {/* ── PHRASE ────────────────────────────────────────────────── */}
            {isPhrase && (
              <div className="mt-3 border-t border-border pt-3">
                <div className="text-xs font-bold text-muted mb-2">Words in this phrase</div>
                <div className="flex flex-wrap gap-2">
                  {token.words!.map((w, i) => (
                    <div key={i} className="flex flex-col items-center gap-0.5">
                      <SubWordChip token={w} savedWords={savedWords} onSaved={onSaved} />
                      <span className="text-[9px] text-muted leading-none text-center max-w-[64px] truncate">
                        {w.meaning}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  {alreadySaved ? (
                    <div className="text-xs font-bold text-mint">✓ in your review deck</div>
                  ) : (
                    <SavePhraseButton token={token} onSaved={onSaved} />
                  )}
                </div>
              </div>
            )}

            {/* ── WORD ──────────────────────────────────────────────────── */}
            {!isPhrase && (
              <WordTokenBody token={token} savedWords={savedWords} onSaved={onSaved} />
            )}
          </div>
        </PopupPortal>
      )}
    </span>
  );
}

// ── Phrase save button ────────────────────────────────────────────────────────

function SavePhraseButton({
  token,
  onSaved,
}: {
  token: CachedToken;
  onSaved: (w: string) => void;
}) {
  const [state, setState] = useState<SaveState>("idle");

  async function save() {
    setState("saving");
    const res = await fetch("/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (res.ok) {
      const data = await res.json();
      setState(data.alreadyExisted ? "exists" : "saved");
      onSaved(token.dictForm);
    } else {
      setState("idle");
    }
  }

  if (state === "saved" || state === "exists")
    return <div className="text-xs font-bold text-mint">✓ in your review deck</div>;

  return (
    <button
      onClick={save}
      disabled={state === "saving"}
      className="w-full rounded-full bg-indigo-ai px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-indigo-soft disabled:opacity-60"
    >
      {state === "saving" ? "Adding…" : "+ Save phrase"}
    </button>
  );
}
