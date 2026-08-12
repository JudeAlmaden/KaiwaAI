"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { type CachedToken } from "@/lib/types";
import KanjiBreakdown from "./KanjiBreakdown";
import { formLabel } from "@/lib/form-label";
import Furigana from "../review/Furigana";
import { lookupWord, type LookupResult } from "@/lib/gemini";
import { hasAnyKey } from "@/lib/api-keys";
import { truncateText } from "@/lib/token-selection";

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
const POPUP_MAX_H = 440;

interface PopupPos {
  left: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

function calcPos(anchor: HTMLElement): PopupPos {
  const r = anchor.getBoundingClientRect();
  const vw = window.innerWidth;
  const spaceAbove = Math.max(0, r.top - GAP - EDGE);
  const spaceBelow = Math.max(0, window.innerHeight - r.bottom - GAP - EDGE);
  const openBelow = spaceBelow >= POPUP_MAX_H || spaceBelow > spaceAbove;
  const availableHeight = openBelow ? spaceBelow : spaceAbove;
  let left = r.left + r.width / 2 - POPUP_W / 2;
  left = Math.max(EDGE, Math.min(left, vw - POPUP_W - EDGE));
  return openBelow
    ? { top: r.bottom + GAP, left, maxHeight: Math.min(POPUP_MAX_H, availableHeight) }
    : {
        bottom: window.innerHeight - r.top + GAP,
        left,
        maxHeight: Math.min(POPUP_MAX_H, availableHeight),
      };
}

// ── Portal wrapper ────────────────────────────────────────────────────────────

function PopupPortal({
  pos,
  children,
  onClose,
  selectionUi = false,
  anchorRef,
}: {
  pos: PopupPos;
  children: React.ReactNode;
  onClose: () => void;
  selectionUi?: boolean;
  /** Button/anchor that opened the popup — clicks on it must not close. */
  anchorRef?: React.RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const openedAtRef = useRef(0);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    openedAtRef.current = performance.now();

    function handle(e: Event) {
      // Ignore the same tap/click gesture that opened the popup (80ms grace is plenty;
      // we use capture phase so we fire before onClick handlers).
      if (performance.now() - openedAtRef.current < 80) return;

      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      if ((target as HTMLElement).closest?.("[data-token-selection-ui]")) return;
      onCloseRef.current();
    }

    const timer = setTimeout(() => {
      document.addEventListener("pointerdown", handle, true);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerdown", handle, true);
    };
  }, [anchorRef]);

  const el = (
    <div
      ref={ref}
      data-token-selection-ui={selectionUi || undefined}
      style={{
        position: "fixed",
        top: pos.top,
        bottom: pos.bottom,
        left: pos.left,
        width: POPUP_W,
        maxHeight: pos.maxHeight,
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
        <PopupPortal pos={pos} onClose={() => setOpen(false)} anchorRef={btnRef}>
          <div className="p-3">
            <div className="font-jp text-base font-bold">
              {token.surface !== token.reading ? (
                <Furigana word={token.surface} reading={token.reading} className="text-base" size="normal" />
              ) : (
                token.surface
              )}
            </div>
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

// Only show the legacy "+ Add all N conjugations" batch button for verbs that
// don't auto-conjugate via base add (suru / kuru / irregular). Regular verbs
// and i/na adjectives already get all forms auto-inserted by the server when
// the base dictionary form is added via `addBase`, so a batch button is noise.
function ShowAllConjugationsButtonForIrregulars({
  wordLookup,
  state,
  studyAllForms,
}: {
  wordLookup: Extract<WordLookupResult, { type: "word" }>;
  state: SaveState;
  studyAllForms: () => void;
}) {
  const word = wordLookup.word;
  if (word.partOfSpeech !== "verb") return null;

  // Best-effort: if the Word record has no explicit verbType, play it safe
  // and assume it might be irregular so user still has the batch option.
  const explicitRegular =
    (word as unknown as Record<string, unknown>).verbType === "godan" ||
    (word as unknown as Record<string, unknown>).verbType === "ichidan";
  if (explicitRegular) return null;

  const hasUnsaved = wordLookup.forms.some(
    (form) => form.formType !== "dictionary" && !form.saved
  );
  if (!hasUnsaved) return null;

  const count = wordLookup.forms.filter(
    (form) => form.formType !== "dictionary" && !form.saved
  ).length;

  return (
    <button
      onClick={studyAllForms}
      disabled={state === "saving"}
      className="w-full rounded-full border border-indigo-ai/30 px-3 py-1.5 text-xs font-bold text-indigo-ai transition-colors hover:bg-indigo-ai/10 disabled:opacity-60"
    >
      {state === "saving" ? "Adding…" : `+ Add all ${count} conjugations`}
    </button>
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
    const params = new URLSearchParams({
      dictForm: token.dictForm,
      surface: token.surface,
    });
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

  const wordLookup = lookupResult?.type === "word" ? lookupResult : null;
  const tappedForm = wordLookup
    ? wordLookup.forms.find(
        (form) => form.form === token.surface || form.reading === token.reading
      )
    : undefined;
  const tappedFormLabel = formLabel(tappedForm?.formType);
  const userHasBase = wordLookup ? wordLookup.userHasBaseWord : alreadySaved;

  async function addBase() {
    if (!wordLookup) return;
    setState("saving");
    const res = await fetch("/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wordId: wordLookup.word.id, wordFormId: null }),
    });
    if (res.ok) {
      const data = await res.json();
      setState(data.alreadyExisted ? "exists" : "saved");
      onSaved(token.dictForm);
      setLookupResult((current) =>
        current?.type === "word"
          ? { ...current, userHasBaseWord: true, forms: current.forms.map((f) => ({ ...f, saved: true })) }
          : current
      );
    } else {
      setState("idle");
    }
  }

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

  async function studyForm() {
    if (!wordLookup || !tappedForm) return;
    setState("saving");
    const res = await fetch("/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wordId: wordLookup.word.id, wordFormId: tappedForm.id }),
    });
    if (res.ok) {
      const data = await res.json();
      setState(data.alreadyExisted ? "exists" : "saved");
      setLookupResult((current) =>
        current?.type === "word"
          ? {
              ...current,
              forms: current.forms.map((form) =>
                form.id === tappedForm.id ? { ...form, saved: true } : form
              ),
            }
          : current
      );
    } else {
      setState("idle");
    }
  }

  async function studyAllForms() {
    if (!wordLookup) return;
    const unsavedFormIds = wordLookup.forms
      .filter((form) => form.formType !== "dictionary" && !form.saved)
      .map((form) => form.id);
    if (!unsavedFormIds.length) return;

    setState("saving");
    const res = await fetch("/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wordId: wordLookup.word.id, wordFormIds: unsavedFormIds }),
    });
    if (res.ok) {
      setLookupResult((current) => current?.type === "word"
        ? { ...current, forms: current.forms.map((form) => ({ ...form, saved: true })) }
        : current);
      setState("idle");
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
          {(tappedFormLabel || (token.surface !== token.dictForm && tappedForm)) && (
            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-indigo-ai">
              {tappedFormLabel || `Form: ${token.surface} (base: ${token.dictForm})`}
            </div>
          )}
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
        {tappedForm && tappedFormLabel ? (
          <div className="space-y-2">
            {!userHasBase && state !== "saved" && state !== "exists" && state !== "merged" && (
              <button
                onClick={addBase}
                disabled={state === "saving"}
                className="w-full rounded-full bg-indigo-ai px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-indigo-soft disabled:opacity-60"
              >
                {state === "saving"
                  ? "Adding…"
                  : `+ Add base word (${
                      wordLookup?.word.dictionary || token.dictForm
                    })`}
              </button>
            )}
            {(tappedForm.saved || state === "saved" || state === "exists") ? (
              <div className="flex items-center gap-1 text-xs font-bold text-mint">
                ✓ this form is in your review deck
              </div>
            ) : (
              <button
                onClick={studyForm}
                disabled={state === "saving"}
                className="w-full rounded-full border border-mint/30 bg-mint/5 px-3 py-1.5 text-xs font-bold text-mint transition-colors hover:bg-mint/10 disabled:opacity-60"
              >
                {state === "saving" ? "Adding…" : "+ Add this conjugation"}
              </button>
            )}
            {userHasBase && wordLookup && (
              <ShowAllConjugationsButtonForIrregulars
                wordLookup={wordLookup}
                state={state}
                studyAllForms={studyAllForms}
              />
            )}
          </div>
        ) : alreadySaved ? (
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
  onClose,
}: {
  token: CachedToken;
  sourceMessageId?: string;
  savedWords: Set<string>;
  onSaved: (word: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose?: () => void;
  vocabLoaded?: boolean;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<PopupPos | null>(null);
  const closePopup = onClose ?? onToggle;

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
        <PopupPortal pos={pos} onClose={closePopup} selectionUi anchorRef={btnRef}>
          <div className="p-4">
            {/* Header */}
            <div className="font-jp text-3xl font-bold text-foreground leading-tight break-words min-w-0" title={token.surface !== token.reading ? token.surface : token.reading}>
              {token.surface !== token.reading ? (
                <Furigana word={truncateText(token.surface, 16)} reading={truncateText(token.reading, 24)} className="text-3xl" size="normal" />
              ) : (
                truncateText(token.reading, 16)
              )}
            </div>
            {token.surface !== token.dictForm && (
              <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-amber break-words">
                Using: {truncateText(token.surface, 20)} → Base form: {truncateText(token.dictForm, 20)}
              </div>
            )}
            <div className="text-xs text-muted mt-0.5 truncate" title={token.romaji}>{truncateText(token.romaji ?? "", 40)}</div>
            <div className="mt-1.5 text-sm font-semibold text-indigo-ai break-words" title={token.meaning}>{truncateText(token.meaning, 120)}</div>
            <div className="mt-0.5 text-[10px] uppercase tracking-widest text-muted truncate" title={token.pos}>
              {truncateText(token.pos, 40)}
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

            {/* ── WORD / PHRASE LOOKUP ───────────────────────────────────── */}
            {/* Always show dictionary body — for phrases this lets you look up
                and save the full phrase expression even when words[] is empty */}
            <div className={isPhrase ? "mt-3 border-t border-border pt-3" : ""}>
              <WordTokenBody token={token} savedWords={savedWords} onSaved={onSaved} />
            </div>

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

// ── Selection lookup popup ────────────────────────────────────────────────────
// Shown when the user drag-selects (desktop) or long-press-ranges (mobile) text.

export function SelectionLookupPopup({
  text,
  anchorRect,
  savedWords,
  onSaved,
  onClose,
  messageContent,
  singleWord = false,
}: {
  /** The selected Japanese text to look up */
  text: string;
  /** Bounding rect of the selection / highlighted range */
  anchorRect: DOMRect;
  savedWords: Set<string>;
  onSaved: (w: string) => void;
  onClose: () => void;
  messageContent?: string;
  /** True when the selection is a single token (we can trust the single-word dict match). */
  singleWord?: boolean;
}) {
  const [aiResult, setAiResult] = useState<LookupResult | null>(null);
  const [dictLookup, setDictLookup] = useState<WordLookupResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [errorKind, setErrorKind] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    let cancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    // Batch reset via microtask so we don't call setState synchronously in effect body
    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      setFailed(false);
      setErrorKind(null);
      setAiResult(null);
      setDictLookup(null);
    });

    async function fetchDefinition() {
      const cleanSearchText = text.trim();

      // 1. Try DB lookup first — only if single-word selection.
      //    For multi-word ranges skip exact surface word fallback because the surface
      //    lookup can incorrectly match just the first word of a multi-word span.
      if (singleWord) {
        try {
          const params = new URLSearchParams({
            dictForm: cleanSearchText,
            surface: cleanSearchText,
          });
          const res = await fetch(`/api/dictionary/lookup?${params}`);
          if (res.ok) {
            const data: WordLookupResult = await res.json();
            if (!cancelled) {
              const hasRealMeaning =
                data.type === "word" ||
                (data.type === "phrase" &&
                  data.phrase.meanings.length > 0 &&
                  data.phrase.meanings[0] !== "(no definition)");
              if (hasRealMeaning) {
                setDictLookup(data);
                setLoading(false);
                return;
              }
            }
          }
        } catch {
          // Ignore DB lookup failure and proceed to AI lookup
        }
      } else {
          try {
            const params = new URLSearchParams({
              dictForm: cleanSearchText,
              surface: cleanSearchText,
            });
            const res = await fetch(`/api/dictionary/lookup?${params}`);
            if (res.ok) {
              const data: WordLookupResult = await res.json();
              if (!cancelled) {
                // Only accept DB match if it's an exact phrase match on the full text.
                const isExactPhrase =
                  data.type === "phrase" &&
                  data.phrase.text === cleanSearchText &&
                  data.phrase.meanings.length > 0 &&
                  data.phrase.meanings[0] !== "(no definition)";
                if (isExactPhrase) {
                  setDictLookup(data);
                  setLoading(false);
                  return;
                }
              }
            }
          } catch {
            // fall through to AI
          }
      }

      // 2. Call Gemini AI lookup for multi-word phrases, sentences, or unknown words
      if (hasAnyKey()) {
        try {
          const res = await lookupWord(
            cleanSearchText,
            messageContent,
            singleWord ? "word" : "phrase",
          );
          if (!cancelled) {
            setAiResult(res);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error("Selection AI lookup error:", e);
          const msg = e instanceof Error ? e.message : "";
          if (!cancelled) {
            if (msg === "RATE_LIMIT") setErrorKind("RATE_LIMIT");
            else if (msg === "BAD_API_KEY") setErrorKind("BAD_API_KEY");
            else if (msg === "NO_API_KEY") setErrorKind("NO_API_KEY");
            else setErrorKind("OTHER");
          }
        }
      }

      if (!cancelled) {
        setFailed(true);
        setLoading(false);
      }
    }

    debounceTimer = setTimeout(() => {
      void fetchDefinition();
    }, 150);
    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [text, messageContent, singleWord]);

  const handleSaveAI = async () => {
    if (!aiResult) return;
    setSaveState("saving");
    const token: CachedToken = {
      surface: text,
      reading: aiResult.reading || text,
      romaji: aiResult.romaji || text,
      meaning: aiResult.meaning,
      pos: (aiResult.pos as unknown as CachedToken["pos"]) ?? "phrase",
      dictForm: aiResult.word || text,
      words: [],
    };
    try {
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        const d = await res.json();
        setSaveState(d.alreadyExisted ? "exists" : "saved");
        onSaved(token.dictForm);
      } else {
        setSaveState("idle");
      }
    } catch {
      setSaveState("idle");
    }
  };

  const dictMeanings = dictLookup
    ? dictLookup.type === "word"
      ? dictLookup.word.meanings.join("; ")
      : dictLookup.phrase.meanings.join("; ")
    : "";
  const dictReading = dictLookup
    ? dictLookup.type === "word"
      ? dictLookup.word.reading
      : dictLookup.phrase.reading
    : null;
  const dictDictForm = dictLookup
    ? dictLookup.type === "word"
      ? dictLookup.word.dictionary
      : dictLookup.phrase.text
    : null;

  const syntheticToken: CachedToken = {
    surface: text,
    reading: dictReading ?? aiResult?.reading ?? text,
    romaji: aiResult?.romaji ?? text,
    meaning: (dictMeanings || aiResult?.meaning) ?? "",
    pos: (dictLookup?.type === "word"
      ? (dictLookup.word.partOfSpeech as CachedToken["pos"])
      : dictLookup?.type === "phrase"
        ? (dictLookup.phrase.partOfSpeech as CachedToken["pos"])
        : (aiResult?.pos as CachedToken["pos"])) ?? "phrase",
    dictForm: dictDictForm ?? aiResult?.word ?? text,
    words: [],
  };

  const isSaved =
    saveState === "saved" ||
    saveState === "exists" ||
    savedWords.has(syntheticToken.dictForm) ||
    savedWords.has(text);

  // Position popup above the selection rect, same logic as calcPos
  const vw = typeof window !== "undefined" ? window.innerWidth : 400;
  const GAP = 8;
  const EDGE = 12;
  const spaceAbove = Math.max(0, anchorRect.top - GAP - EDGE);
  const spaceBelow = Math.max(0, (typeof window !== "undefined" ? window.innerHeight : 800) - anchorRect.bottom - GAP - EDGE);
  const openBelow = spaceBelow >= POPUP_MAX_H || spaceBelow > spaceAbove;
  let left = anchorRect.left + anchorRect.width / 2 - POPUP_W / 2;
  left = Math.max(EDGE, Math.min(left, vw - POPUP_W - EDGE));
  const pos: PopupPos = openBelow
    ? { top: anchorRect.bottom + GAP, left, maxHeight: Math.min(POPUP_MAX_H, spaceBelow) }
    : { bottom: (typeof window !== "undefined" ? window.innerHeight : 800) - anchorRect.top + GAP, left, maxHeight: Math.min(POPUP_MAX_H, spaceAbove) };

  return (
    <PopupPortal pos={pos} onClose={onClose} selectionUi>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          {loading ? (
            <div className="flex items-center gap-2 text-sm font-semibold text-indigo-ai">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-ai border-t-transparent" />
              Looking up…
            </div>
          ) : (
            <div className="font-jp text-2xl font-bold text-foreground leading-snug break-words min-w-0 flex-1" title={dictLookup?.type==="word" ? dictLookup.word.dictionary : dictLookup?.type==="phrase" ? dictLookup.phrase.text : (aiResult?.word || text)}>
              {aiResult?.reading && (aiResult.word || text) !== aiResult.reading ? (
                <Furigana
                  word={truncateText(aiResult.word || text, 24)}
                  reading={truncateText(aiResult.reading, 24)}
                  className="text-2xl"
                  size="normal"
                />
              ) : dictLookup?.type === "word" ? (
                truncateText(dictLookup.word.dictionary, 24)
              ) : dictLookup?.type === "phrase" ? (
                truncateText(dictLookup.phrase.text, 24)
              ) : (
                truncateText(aiResult?.word || text, 32)
              )}
            </div>
          )}
          <button
            onClick={onClose}
            className="shrink-0 rounded-full p-1 text-muted hover:bg-border/40 hover:text-foreground transition-colors"
            aria-label="Close lookup"
          >
            ✕
          </button>
        </div>

        {failed && !loading && (
          <div className="mt-3 rounded-xl p-2.5 text-xs">
            {errorKind === "RATE_LIMIT" ? (
              <div className="rounded-xl border border-amber/30 bg-amber/5 p-2.5 text-amber">
                <span className="font-bold">Rate limit hit.</span> Google Gemini is
                temporarily throttling requests. Wait a few seconds and tap
                <span className="font-semibold"> Look up</span> again, or close and
                reselect the text.
              </div>
            ) : errorKind === "BAD_API_KEY" ? (
              <div className="rounded-xl border border-sakura/30 bg-sakura/5 p-2.5 text-sakura">
                <span className="font-bold">Invalid API key.</span> Double-check your
                Gemini key in <span className="font-semibold">Settings → API Keys</span>
                and make sure it hasn&apos;t expired or been restricted.
              </div>
            ) : errorKind === "NO_API_KEY" ? (
              <div className="rounded-xl border border-amber/30 bg-amber/5 p-2.5 text-amber">
                <span className="font-bold">No API key set.</span> Add your Google
                Gemini key in <span className="font-semibold">Settings → API Keys</span>
                to enable AI-powered lookups for phrases and unknown words.
              </div>
            ) : (
              <div className="rounded-xl border border-amber/30 bg-amber/5 p-2.5 text-amber">
                Could not retrieve definition. Check your API key in Settings or
                try again in a moment.
              </div>
            )}
          </div>
        )}

        {/* 1. DB Dictionary Match */}
        {!loading && dictLookup && (
          <div className="mt-2">
            <WordTokenBody token={syntheticToken} savedWords={savedWords} onSaved={onSaved} />
          </div>
        )}

        {/* 2. AI Lookup Result */}
        {!loading && aiResult && !dictLookup && (
          <div className="mt-3 space-y-2">
            {aiResult.romaji && (
              <div className="text-xs text-muted italic truncate" title={aiResult.romaji}>{truncateText(aiResult.romaji, 48)}</div>
            )}
            <div className="text-sm font-bold text-indigo-ai leading-relaxed break-words" title={aiResult.meaning}>
              {truncateText(aiResult.meaning, 240)}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded bg-indigo-ai/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-ai truncate max-w-[60%]" title={aiResult.pos}>
                {truncateText(aiResult.pos, 24)}
              </span>
              <span className="rounded bg-sakura/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sakura">
                AI Translate
              </span>
            </div>

            {aiResult.example && (
              <div className="mt-2 rounded-xl bg-surface/50 p-2.5 text-xs border border-border/50">
                <div className="font-jp font-semibold text-foreground break-words" title={aiResult.example}>
                  {truncateText(aiResult.example, 60)}
                </div>
                {aiResult.exampleEn && (
                  <div className="text-muted text-[11px] mt-0.5 break-words" title={aiResult.exampleEn}>
                    {truncateText(aiResult.exampleEn, 80)}
                  </div>
                )}
              </div>
            )}

            {/* Kanji Breakdown */}
            <div className="mt-3 border-t border-border pt-2">
              <KanjiBreakdown word={text} />
            </div>

            {/* Save to Vocabulary Button */}
            <div className="mt-3">
              {isSaved ? (
                <div className="flex items-center gap-1 text-xs font-bold text-mint">
                  ✓ in your review deck
                </div>
              ) : (
                <button
                  onClick={handleSaveAI}
                  disabled={saveState === "saving"}
                  className="w-full rounded-full bg-indigo-ai px-3 py-2 text-xs font-bold text-white shadow transition-all hover:scale-[1.02] hover:bg-indigo-soft disabled:opacity-60 cursor-pointer"
                >
                  {saveState === "saving" ? "Adding…" : "+ Add to vocabulary"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </PopupPortal>
  );
}
