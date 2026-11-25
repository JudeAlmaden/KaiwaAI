"use client";

import { useEffect, useState } from "react";
import { type CachedToken } from "@/lib/types";
import KanjiBreakdown from "./KanjiBreakdown";
import {
  POPUP_MAX_H,
  POPUP_W,
  type PopupPos,
  PopupPortal,
} from "./WordTokenPopup";
import Furigana from "../review/Furigana";
import { lookupWord, type LookupResult } from "@/lib/gemini";
import { aiLookupCacheKey, cacheGet, cacheSet, dictLookupCacheKey } from "@/lib/lookup-cache";
import { hasAnyKey } from "@/lib/api-keys";
import { truncateText } from "@/lib/token-selection";
import {
  WordTokenBody,
  type SaveState,
  type WordLookupResult,
} from "./WordToken";

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
      const dictKey = dictLookupCacheKey(cleanSearchText, cleanSearchText);
      // Scoped by sentence: the same word can mean something else in another
      // context, so a cached AI gloss is only valid for the sentence it came from.
      const aiKey = aiLookupCacheKey(
        cleanSearchText,
        singleWord ? "word" : "phrase",
        messageContent ?? text
      );

      // A definition seen in this sitting (or earlier today) does not need the
      // network again — practice sentences repeat words constantly.
      const cachedDict = cacheGet<WordLookupResult>(dictKey);
      if (cachedDict) {
        if (cancelled) return;
        setDictLookup(cachedDict);
        setLoading(false);
        return;
      }
      const cachedAi = cacheGet<LookupResult>(aiKey);
      if (cachedAi) {
        if (cancelled) return;
        setAiResult(cachedAi);
        setLoading(false);
        return;
      }

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
                cacheSet(dictKey, data);
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
                  cacheSet(dictKey, data);
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
            cacheSet(aiKey, res);
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

  const handleRemoveAI = async () => {
    setSaveState("saving");
    const target = aiResult?.word || text;
    try {
      const res = await fetch("/api/flashcards", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: target }),
      });
      if (res.ok) {
        setSaveState("idle");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("kaiwa:vocab-removed", { detail: { word: target } }));
          if (text !== target) {
            window.dispatchEvent(new CustomEvent("kaiwa:vocab-removed", { detail: { word: text } }));
          }
        }
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
            {aiResult.romaji &&
              aiResult.romaji !== text &&
              !/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(aiResult.romaji) && (
                <div className="text-xs text-muted italic truncate" title={aiResult.romaji}>{truncateText(aiResult.romaji, 48)}</div>
            )}
            {aiResult.meaning &&
              aiResult.meaning !== "[" &&
              aiResult.meaning !== "]" &&
              aiResult.meaning !== "[]" && (
                <div className="text-sm font-bold text-indigo-ai leading-relaxed break-words" title={aiResult.meaning}>
                  {truncateText(aiResult.meaning, 240)}
                </div>
            )}
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
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <div className="flex items-center gap-1 text-xs font-bold text-mint">
                    ✓ in your review deck
                  </div>
                  <button
                    onClick={handleRemoveAI}
                    disabled={saveState === "saving"}
                    className="text-[11px] font-semibold text-muted hover:text-sakura transition-colors cursor-pointer"
                    title="Remove from review deck"
                  >
                    {saveState === "saving" ? "Removing…" : "Remove"}
                  </button>
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
