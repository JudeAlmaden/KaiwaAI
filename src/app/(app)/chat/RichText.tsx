"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import WordToken from "./WordToken";
import LookupToken from "./LookupToken";
import { SelectionLookupPopup } from "./WordToken";
import { hasFeedback, type CachedToken, type Correction } from "@/lib/types";

const JP_CHAR = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;

// Match runs of Japanese (kana/kanji + long-vowel mark) so each "word-ish" run
// is individually tappable when a message has no cached tokens.
const JP_RUN = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFFー々]+/g;

/** Spacing between rendered tokens (Japanese has no spaces; English does). */
function spaceBetween(prev: string | undefined, curr: string): boolean {
  if (!prev) return false;
  if (JP_CHAR.test(prev) || JP_CHAR.test(curr)) return false;
  if (/^[!?.,)\]}"」』）、。…:;%]/.test(curr)) return false;
  if (/[([{"「『（]$/.test(prev)) return false;
  return true;
}

// ── Selection state types ─────────────────────────────────────────────────────

type SelectionLookup = { text: string; rect: DOMRect } | null;
type RangeState = { start: number; end: number } | null;

const LONG_PRESS_MS = 400;

/** Renders an AI message body with tap-to-translate tokens, an English toggle,
 *  and a grammar-correction card. Shared by Kai's 1:1 chat and group chats. */
export function RichKaiText({
  content,
  tokensJson,
  english,
  correctionJson,
  messageId,
  savedWords: externalSavedWords,
  onSavedWord: externalOnSavedWord,
}: {
  content: string;
  tokensJson?: string | null;
  english?: string | null;
  correctionJson?: string | null;
  messageId: string;
  savedWords?: Set<string>;
  onSavedWord?: (word: string) => void;
}) {
  const [internalSavedWords, setInternalSavedWords] = useState<Set<string>>(new Set());
  const [openToken, setOpenToken] = useState<string | null>(null);
  const [vocabLoaded, setVocabLoaded] = useState(Boolean(externalSavedWords));

  const savedWords = externalSavedWords ?? internalSavedWords;

  const handleSaved = useCallback(
    (w: string) => {
      setInternalSavedWords((s) => new Set(s).add(w));
      if (externalOnSavedWord) externalOnSavedWord(w);
    },
    [externalOnSavedWord]
  );

  // Desktop text-selection lookup
  const [desktopSelection, setDesktopSelection] = useState<SelectionLookup>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mobile long-press range selection
  const [rangeState, setRangeState] = useState<RangeState>(null);
  const [rangeLookup, setRangeLookup] = useState<SelectionLookup>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect coarse pointer (touch device) — initialised lazily so no effect needed
  const [isMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(pointer: coarse)").matches
      : false
  );

  // Pre-load user's saved vocabulary on mount only if not provided externally
  useEffect(() => {
    if (externalSavedWords) {
      // already have words — no fetch needed; flip the flag in microtask to
      // avoid calling setState synchronously inside the effect body
      Promise.resolve().then(() => setVocabLoaded(true));
      return;
    }
    fetch("/api/flashcards?wordsOnly=true")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.words)) {
          setInternalSavedWords(new Set(d.words.map((w: { word: string }) => w.word)));
        }
        setVocabLoaded(true);
      })
      .catch(() => setVocabLoaded(true));
  }, [externalSavedWords]);

  // ── Desktop: selectionchange → popup (debounced 300ms) ─────────────────────
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    function onSelectionChange() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) {
          setDesktopSelection(null);
          return;
        }
        const text = sel.toString().trim();
        if (!JP_CHAR.test(text)) { setDesktopSelection(null); return; }
        if (!containerRef.current) return;
        const range = sel.getRangeAt(0);
        if (!containerRef.current.contains(range.commonAncestorContainer)) {
          setDesktopSelection(null);
          return;
        }
        setDesktopSelection({ text, rect: range.getBoundingClientRect() });
      }, 300);
    }
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, []);

  let tokens: CachedToken[] | null = null;
  if (tokensJson) {
    try { tokens = JSON.parse(tokensJson); } catch { tokens = null; }
  }

  // ── Mobile: long-press → range-select ─────────────────────────────────────
  const startLongPress = useCallback((idx: number) => {
    longPressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(30);
      setRangeState({ start: idx, end: idx });
      setOpenToken(null);
    }, LONG_PRESS_MS);
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const extendRange = useCallback(
    (idx: number, toks: CachedToken[]) => {
      setRangeState((prev) => {
        if (!prev) return prev;
        const start = Math.min(prev.start, idx);
        const end = Math.max(prev.end, idx);
        const text = toks
          .slice(start, end + 1)
          .map((t) => t.surface)
          .join("")
          .trim();
        if (JP_CHAR.test(text)) {
          const el = document.getElementById(`tok-${messageId}-${idx}`);
          const rect = el ? el.getBoundingClientRect() : new DOMRect(0, 200, 50, 24);
          setRangeLookup({ text, rect });
        }
        return null;
      });
    },
    [messageId]
  );

  const clearRange = useCallback(() => {
    setRangeState(null);
    setRangeLookup(null);
  }, []);

  return (
    <>
      {/* On mobile, disable native text selection so the long-press isn't
          hijacked by the OS copy toolbar. Desktop keeps native selection. */}
      <div
        ref={containerRef}
        className={`font-jp text-lg leading-loose${isMobile ? " select-none" : ""}`}
      >
        {tokens && tokens.length > 0 ? (
          tokens.map((t, i) => {
            const key = `${messageId}-${i}`;
            const inRange =
              rangeState !== null && i >= rangeState.start && i <= rangeState.end;
            return (
              <span key={i}>
                {spaceBetween(tokens![i - 1]?.surface, t.surface) ? " " : ""}
                <span
                  id={`tok-${messageId}-${i}`}
                  className={inRange ? "rounded bg-indigo-ai/20" : ""}
                  onTouchStart={isMobile ? () => startLongPress(i) : undefined}
                  onTouchEnd={isMobile ? cancelLongPress : undefined}
                  onTouchCancel={isMobile ? cancelLongPress : undefined}
                  onClick={
                    rangeState !== null && isMobile
                      ? () => extendRange(i, tokens!)
                      : undefined
                  }
                >
                  <WordToken
                    token={t}
                    sourceMessageId={messageId}
                    savedWords={savedWords}
                    onSaved={handleSaved}
                    isOpen={openToken === key && rangeState === null}
                    onToggle={() => {
                      if (rangeState === null)
                        setOpenToken((cur) => (cur === key ? null : key));
                    }}
                    vocabLoaded={vocabLoaded}
                  />
                </span>
              </span>
            );
          })
        ) : (
          <FallbackText
            content={content}
            messageId={messageId}
            openToken={openToken}
            onToggle={(key) =>
              setOpenToken((cur) => (cur === key ? null : key))
            }
          />
        )}
      </div>

      {/* Mobile range-mode hint banner */}
      {rangeState !== null && (
        <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-indigo-ai/30 bg-indigo-ai/5 px-3 py-1.5">
          <span className="text-xs text-indigo-ai">
            ✦ Tap another word to look up the selection
          </span>
          <button
            onClick={clearRange}
            className="ml-auto text-xs font-bold text-muted hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}

      {english && <EnglishToggle text={english} />}
      {correctionJson && <CorrectionCard raw={correctionJson} />}

      {/* Desktop: selection drag popup */}
      {desktopSelection && (
        <SelectionLookupPopup
          text={desktopSelection.text}
          anchorRect={desktopSelection.rect}
          savedWords={savedWords}
          onSaved={handleSaved}
          onClose={() => {
            setDesktopSelection(null);
            window.getSelection()?.removeAllRanges();
          }}
        />
      )}

      {/* Mobile: range tap popup */}
      {rangeLookup && (
        <SelectionLookupPopup
          text={rangeLookup.text}
          anchorRect={rangeLookup.rect}
          savedWords={savedWords}
          onSaved={handleSaved}
          onClose={clearRange}
        />
      )}
    </>
  );
}

/** When a message has no cached tokens, split it into Japanese runs (tappable,
 *  looked up on demand) and plain text so tap-to-translate still works. */
function FallbackText({
  content,
  messageId,
  openToken,
  onToggle,
}: {
  content: string;
  messageId: string;
  openToken: string | null;
  onToggle: (key: string) => void;
}) {
  if (!JP_CHAR.test(content)) return <span>{content}</span>;

  const parts = segmentForFallback(content);

  return (
    <>
      {parts.map((p, i) =>
        p.jp ? (
          <LookupToken
            key={i}
            surface={p.text}
            isOpen={openToken === `${messageId}-f${i}`}
            onToggle={() => onToggle(`${messageId}-f${i}`)}
          />
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </>
  );
}

type SegItem = { text: string; jp: boolean };

/** Split text for the no-tokens fallback. Uses Intl.Segmenter (word
 *  granularity) for real Japanese word boundaries when available, so each word
 *  is individually tappable instead of one giant run; otherwise falls back to
 *  splitting on contiguous Japanese runs. */
function segmentForFallback(content: string): SegItem[] {
  const Seg = (
    Intl as unknown as {
      Segmenter?: new (
        loc?: string,
        opts?: { granularity?: string }
      ) => { segment: (s: string) => Iterable<{ segment: string }> };
    }
  ).Segmenter;

  if (Seg) {
    try {
      const seg = new Seg("ja", { granularity: "word" });
      const out: SegItem[] = [];
      for (const { segment } of seg.segment(content)) {
        const jp = JP_CHAR.test(segment);
        const prev = out[out.length - 1];
        // Merge adjacent non-Japanese pieces so English/punctuation stays whole.
        if (!jp && prev && !prev.jp) prev.text += segment;
        else out.push({ text: segment, jp });
      }
      return out;
    } catch {
      // fall through to the run-based split
    }
  }

  const parts: SegItem[] = [];
  let last = 0;
  for (const m of content.matchAll(JP_RUN)) {
    const start = m.index ?? 0;
    if (start > last) parts.push({ text: content.slice(last, start), jp: false });
    parts.push({ text: m[0], jp: true });
    last = start + m[0].length;
  }
  if (last < content.length) parts.push({ text: content.slice(last), jp: false });
  return parts;
}

function EnglishToggle({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="mt-1.5 border-t border-border/60 pt-1.5">
      {show ? (
        <div className="text-sm text-muted">{text}</div>
      ) : (
        <button
          onClick={() => setShow(true)}
          className="text-xs font-bold text-indigo-ai/70 transition-colors hover:text-indigo-ai"
        >
          Show English
        </button>
      )}
    </div>
  );
}

function CorrectionCard({ raw }: { raw: string }) {
  let c: Correction | null = null;
  try {
    c = JSON.parse(raw) as Correction;
  } catch {
    c = null;
  }
  if (!hasFeedback(c)) return null;

  const incorrect = c.status === "incorrect";
  return (
    <div
      className={`mt-1.5 rounded-2xl border-2 px-3 py-2 text-sm ${
        incorrect ? "border-sakura/30 bg-sakura/5" : "border-amber/30 bg-amber/5"
      }`}
    >
      <div
        className={`mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${
          incorrect ? "text-sakura" : "text-amber"
        }`}
      >
        <span>✏️</span>
        {incorrect ? "Correction" : "More natural"}
      </div>
      {c.explanation && <div className="text-muted">{c.explanation}</div>}
      {c.corrected && (
        <div className="mt-1 font-jp text-base">
          {c.corrected}
          {c.romaji && <span className="ml-2 text-xs text-muted">{c.romaji}</span>}
        </div>
      )}
      {c.natural && c.natural !== c.corrected && (
        <div className="mt-1 text-xs text-muted">
          More natural: <span className="font-jp">{c.natural}</span>
        </div>
      )}
    </div>
  );
}

