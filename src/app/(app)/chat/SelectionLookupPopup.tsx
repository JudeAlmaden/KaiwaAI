"use client";

import { useEffect, useState } from "react";
import { lookupWord, type LookupResult } from "@/lib/gemini";
import { hasAnyKey } from "@/lib/api-keys";
import { type CachedToken, type PartOfSpeech } from "@/lib/types";
import { truncateText } from "@/lib/token-selection";
import {
  cacheGet,
  cacheSet,
  dictLookupCacheKey,
} from "@/lib/lookup-cache";
import Furigana from "../review/Furigana";
import KanjiBreakdown from "./KanjiBreakdown";
import { TokenPopup, calcPopupPos, type PopupPos } from "./TokenPopup";

type SaveState = "idle" | "saving" | "saved" | "exists";

type WordLookupResult =
  | {
      type: "word";
      word: {
        dictionary: string;
        reading: string;
        meanings: string[];
        partOfSpeech: string;
      };
    }
  | {
      type: "phrase";
      phrase: {
        text: string;
        reading: string;
        meanings: string[];
        partOfSpeech: string;
      };
    };

/** Popup for a single- or multi-token range selection ("Look up …"). */
export default function SelectionLookupPopup({
  text,
  anchorRect,
  savedWords,
  onSaved,
  onClose,
  singleWord = false,
}: {
  text: string;
  anchorRect: DOMRect;
  savedWords: Set<string>;
  onSaved: (w: string) => void;
  onClose: () => void;
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

    async function fetchDefinition() {
      if (cancelled) return;
      setLoading(true);
      setFailed(false);
      setErrorKind(null);
      setAiResult(null);
      setDictLookup(null);

      const clean = text.trim();
      const cacheKey = dictLookupCacheKey(clean, singleWord ? "1" : "n");
      const cached = cacheGet<WordLookupResult | { ai: LookupResult }>(cacheKey);
      if (cached && "type" in cached) {
        if (!cancelled) {
          setDictLookup(cached);
          setLoading(false);
        }
        return;
      }
      if (cached && "ai" in cached) {
        if (!cancelled) {
          setAiResult(cached.ai);
          setLoading(false);
        }
        return;
      }

      try {
        const params = new URLSearchParams({
          dictForm: clean,
          surface: clean,
        });
        const res = await fetch(`/api/dictionary/lookup?${params}`);
        if (res.ok) {
          const data: WordLookupResult = await res.json();
          const ok =
            singleWord ||
            (data.type === "phrase" &&
              data.phrase.text === clean &&
              data.phrase.meanings[0] !== "(no definition)");
          const hasMeaning =
            data.type === "word" ||
            (data.type === "phrase" &&
              data.phrase.meanings.length > 0 &&
              data.phrase.meanings[0] !== "(no definition)");
          if (ok && hasMeaning) {
            cacheSet(cacheKey, data);
            if (!cancelled) {
              setDictLookup(data);
              setLoading(false);
              return;
            }
          }
        }
      } catch {
        // fall through
      }

      if (hasAnyKey()) {
        try {
          const res = await lookupWord(clean);
          cacheSet(cacheKey, { ai: res });
          if (!cancelled) {
            setAiResult(res);
            setLoading(false);
            return;
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : "";
          if (!cancelled) {
            if (msg === "RATE_LIMIT") setErrorKind("RATE_LIMIT");
            else if (msg === "BAD_API_KEY") setErrorKind("BAD_API_KEY");
            else if (msg === "NO_API_KEY") setErrorKind("NO_API_KEY");
            else setErrorKind("OTHER");
          }
        }
      } else if (!cancelled) {
        setErrorKind("NO_API_KEY");
      }

      if (!cancelled) {
        setFailed(true);
        setLoading(false);
      }
    }

    const t = setTimeout(() => void fetchDefinition(), 120);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [text, singleWord]);

  const dictForm =
    dictLookup?.type === "word"
      ? dictLookup.word.dictionary
      : dictLookup?.type === "phrase"
        ? dictLookup.phrase.text
        : aiResult?.word || text;
  const meaning =
    dictLookup?.type === "word"
      ? dictLookup.word.meanings.join("; ")
      : dictLookup?.type === "phrase"
        ? dictLookup.phrase.meanings.join("; ")
        : aiResult?.meaning ?? "";
  const reading =
    dictLookup?.type === "word"
      ? dictLookup.word.reading
      : dictLookup?.type === "phrase"
        ? dictLookup.phrase.reading
        : aiResult?.reading ?? text;

  const isSaved =
    saveState === "saved" ||
    saveState === "exists" ||
    savedWords.has(dictForm) ||
    savedWords.has(text);

  async function save() {
    setSaveState("saving");
    const token: CachedToken = {
      surface: text,
      reading,
      romaji: aiResult?.romaji || text,
      meaning,
      pos: (aiResult?.pos as PartOfSpeech) || "phrase",
      dictForm,
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
        onSaved(dictForm);
      } else setSaveState("idle");
    } catch {
      setSaveState("idle");
    }
  }

  const vw = typeof window !== "undefined" ? window.innerWidth : 400;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const GAP = 8;
  const EDGE = 12;
  const POPUP_W = 340;
  const POPUP_MAX_H = 440;
  const spaceAbove = Math.max(0, anchorRect.top - GAP - EDGE);
  const spaceBelow = Math.max(0, vh - anchorRect.bottom - GAP - EDGE);
  const openBelow = spaceBelow >= POPUP_MAX_H || spaceBelow > spaceAbove;
  let left = anchorRect.left + anchorRect.width / 2 - POPUP_W / 2;
  left = Math.max(EDGE, Math.min(left, vw - POPUP_W - EDGE));
  const pos: PopupPos = openBelow
    ? { top: anchorRect.bottom + GAP, left, maxHeight: Math.min(POPUP_MAX_H, spaceBelow) }
    : {
        bottom: vh - anchorRect.top + GAP,
        left,
        maxHeight: Math.min(POPUP_MAX_H, spaceAbove),
      };

  // silence unused - calcPopupPos kept for API parity / future anchor element
  void calcPopupPos;

  return (
    <div data-token-selection-ui>
      <TokenPopup pos={pos} onClose={onClose}>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            {loading ? (
              <div className="text-sm font-semibold text-indigo-ai">Looking up…</div>
            ) : (
              <div className="font-jp text-2xl font-bold min-w-0 flex-1">
                {reading !== dictForm ? (
                  <Furigana
                    word={truncateText(dictForm, 24)}
                    reading={truncateText(reading, 24)}
                    className="text-2xl"
                    size="normal"
                  />
                ) : (
                  truncateText(dictForm, 32)
                )}
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 text-muted hover:text-foreground"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {failed && !loading && (
            <div className="mt-2 text-xs text-sakura">
              {errorKind === "NO_API_KEY"
                ? "Add a Gemini API key in Settings for AI lookups."
                : errorKind === "RATE_LIMIT"
                  ? "Rate limited — try again in a moment."
                  : "Couldn’t look that up. Try again."}
            </div>
          )}

          {!loading && (dictLookup || aiResult) && (
            <div className="mt-2 space-y-2">
              <div className="text-sm font-semibold text-indigo-ai">
                {truncateText(meaning, 240)}
              </div>
              {aiResult && !dictLookup && (
                <span className="rounded bg-sakura/10 px-1.5 py-0.5 text-[10px] font-bold text-sakura">
                  AI Translate
                </span>
              )}
              <KanjiBreakdown word={text} />
              {isSaved ? (
                <div className="text-xs font-bold text-mint">✓ in your review deck</div>
              ) : (
                <button
                  type="button"
                  onClick={save}
                  disabled={saveState === "saving"}
                  className="w-full rounded-full bg-indigo-ai px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                >
                  {saveState === "saving" ? "Adding…" : "+ Add to vocabulary"}
                </button>
              )}
            </div>
          )}
        </div>
      </TokenPopup>
    </div>
  );
}
