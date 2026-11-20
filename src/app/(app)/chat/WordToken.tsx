"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { type CachedToken } from "@/lib/types";
import KanjiBreakdown from "./KanjiBreakdown";
import { calcPos, PopupPortal, type PopupPos } from "./WordTokenPopup";
import { formLabel } from "@/lib/form-label";
import Furigana from "../review/Furigana";
import { truncateText } from "@/lib/token-selection";
import { cacheGet, cacheSet, dictLookupCacheKey } from "@/lib/lookup-cache";

export type SaveState = "idle" | "saving" | "saved" | "exists" | "merged";

const JP_CHAR = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;

export function isTappable(token: CachedToken): boolean {
  return JP_CHAR.test(token.surface);
}

export type WordLookupResult =
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
            {token.romaji &&
              token.romaji !== token.surface &&
              token.romaji !== token.reading &&
              !/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(token.romaji) && (
                <div className="mt-0.5 text-xs text-muted italic">{token.romaji}</div>
            )}
            {token.meaning &&
              token.meaning !== "[" &&
              token.meaning !== "]" &&
              token.meaning !== "[]" &&
              token.meaning !== token.surface && (
                <div className="mt-1 text-sm font-semibold text-indigo-ai">{token.meaning}</div>
            )}
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

export function WordTokenBody({
  token,
  savedWords,
  onSaved,
  sourceMessageId,
  compact = false,
}: {
  token: CachedToken;
  savedWords: Set<string>;
  onSaved: (w: string) => void;
  /** Message the popup was opened from — remembered on the saved card. */
  sourceMessageId?: string;
  compact?: boolean;
}) {
  const [state, setState] = useState<SaveState>("idle");
  const [lookupResult, setLookupResult] = useState<WordLookupResult | null>(null);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lookupResult || loading || lookupFailed) return;
    const cacheKey = dictLookupCacheKey(token.dictForm, token.surface);
    const cached = cacheGet<WordLookupResult>(cacheKey);
    if (cached) {
      setTimeout(() => setLookupResult(cached), 0);
      return;
    }
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
        cacheSet(cacheKey, d);
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
      body: JSON.stringify({ wordId: wordLookup.word.id, wordFormId: null, sourceMessageId }),
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

  async function removeCard() {
    setState("saving");
    const targetWord = wordLookup?.word.dictionary || token.dictForm;
    const res = await fetch(`/api/flashcards`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        word: targetWord,
        wordId: wordLookup?.word.id,
      }),
    });
    if (res.ok) {
      setState("idle");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("kaiwa:vocab-removed", { detail: { word: targetWord } }));
        if (token.surface && token.surface !== targetWord) {
          window.dispatchEvent(new CustomEvent("kaiwa:vocab-removed", { detail: { word: token.surface } }));
        }
      }
      setLookupResult((current) =>
        current?.type === "word"
          ? {
              ...current,
              userHasBaseWord: false,
              forms: current.forms.map((f) => ({ ...f, saved: false })),
            }
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

  async function studyForm() {
    if (!wordLookup || !tappedForm) return;
    setState("saving");
    const res = await fetch("/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wordId: wordLookup.word.id,
        wordFormId: tappedForm.id,
        sourceMessageId,
      }),
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
      body: JSON.stringify({
        wordId: wordLookup.word.id,
        wordFormIds: unsavedFormIds,
        sourceMessageId,
      }),
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
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-1 text-xs font-bold text-mint">
              ✓ in your review deck
            </div>
            <button
              onClick={removeCard}
              disabled={state === "saving"}
              className="text-[11px] font-semibold text-muted hover:text-sakura transition-colors cursor-pointer"
              title="Remove from review deck"
            >
              {state === "saving" ? "Removing…" : "Remove"}
            </button>
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
  sourceMessageId,
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
            {token.romaji &&
              token.romaji !== token.surface &&
              token.romaji !== token.reading &&
              !/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(token.romaji) && (
                <div className="text-xs text-muted mt-0.5 truncate" title={token.romaji}>
                  {truncateText(token.romaji, 40)}
                </div>
            )}
            {token.meaning &&
              token.meaning !== "[" &&
              token.meaning !== "]" &&
              token.meaning !== "[]" &&
              token.meaning !== token.surface && (
                <div className="mt-1.5 text-sm font-semibold text-indigo-ai break-words" title={token.meaning}>
                  {truncateText(token.meaning, 120)}
                </div>
            )}
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
                    <SavePhraseButton
                      token={token}
                      sourceMessageId={sourceMessageId}
                      onSaved={onSaved}
                    />
                  )}
                </div>
              </div>
            )}

            {/* ── WORD / PHRASE LOOKUP ───────────────────────────────────── */}
            {/* Always show dictionary body — for phrases this lets you look up
                and save the full phrase expression even when words[] is empty */}
            <div className={isPhrase ? "mt-3 border-t border-border pt-3" : ""}>
              <WordTokenBody
                token={token}
                savedWords={savedWords}
                onSaved={onSaved}
                sourceMessageId={sourceMessageId}
              />
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
  sourceMessageId,
  onSaved,
}: {
  token: CachedToken;
  sourceMessageId?: string;
  onSaved: (w: string) => void;
}) {
  const [state, setState] = useState<SaveState>("idle");

  async function save() {
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
