"use client";

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import WordToken from "./WordToken";
import LookupToken from "./LookupToken";
import { SelectionLookupPopup } from "./WordToken";
import { hasFeedback, type CachedToken, type Correction } from "@/lib/types";
import { repairSplitTokenSurfaces } from "@/lib/token-repair";
import { moveRangeEdge, rangeText, type RangeEdge, type TokenRange } from "@/lib/token-selection";

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
type HandlePosition = { left: number; top: number };
type HandlePositions = { start: HandlePosition; end: HandlePosition } | null;

const LONG_PRESS_MS = 450;

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
  onSelectionModeChange,
}: {
  content: string;
  tokensJson?: string | null;
  english?: string | null;
  correctionJson?: string | null;
  messageId: string;
  savedWords?: Set<string>;
  onSavedWord?: (word: string) => void;
  onSelectionModeChange?: (active: boolean) => void;
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
  const [tokenRange, setTokenRange] = useState<TokenRange | null>(null);
  const [rangeLookup, setRangeLookup] = useState<SelectionLookup>(null);
  const [handlePositions, setHandlePositions] = useState<HandlePositions>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressTokenClickRef = useRef(false);
  const activeHandleRef = useRef<RangeEdge | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const handleDragFrame = useRef<number | null>(null);
  const pendingHandleUpdateRef = useRef<{
    edge: RangeEdge;
    clientX: number;
    clientY: number;
  } | null>(null);
  const [isTouch] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
  );

  useEffect(() => {
    onSelectionModeChange?.(tokenRange !== null);
  }, [onSelectionModeChange, tokenRange]);

  useEffect(
    () => () => onSelectionModeChange?.(false),
    [onSelectionModeChange]
  );


  // Detect coarse pointer (touch device) — initialised lazily so no effect needed

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
      if (isTouch) return;
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
  }, [isTouch]);

  let tokens: CachedToken[] | null = null;
  if (tokensJson) {
    try {
      tokens = repairSplitTokenSurfaces(JSON.parse(tokensJson) as CachedToken[]);
    } catch {
      tokens = null;
    }
  }

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const startLongPress = useCallback(
    (index: number) => {
      if (!isTouch || tokenRange) return;
      cancelLongPress();
      longPressTimer.current = setTimeout(() => {
        suppressTokenClickRef.current = true;
        window.setTimeout(() => {
          suppressTokenClickRef.current = false;
        }, 250);
        setOpenToken(null);
        setTokenRange({ start: index, end: index });
      }, LONG_PRESS_MS);
    },
    [cancelLongPress, isTouch, tokenRange]
  );

  const clearTokenRange = useCallback(() => {
    setTokenRange(null);
    setRangeLookup(null);
    setHandlePositions(null);
  }, []);

  const updateTokenRangeFromPoint = useCallback(
    (edge: RangeEdge, clientX: number, clientY: number) => {
      const target = document
        .elementFromPoint(clientX, clientY)
        ?.closest<HTMLElement>("[data-token-index]");
      const index = Number(target?.dataset.tokenIndex);
      if (!Number.isInteger(index)) return;
      setTokenRange((current) =>
        current ? moveRangeEdge(current, edge, index) : current
      );
    },
    []
  );

  const applyPendingHandleUpdate = useCallback(() => {
    handleDragFrame.current = null;
    const pending = pendingHandleUpdateRef.current;
    pendingHandleUpdateRef.current = null;
    if (!pending) return;
    updateTokenRangeFromPoint(pending.edge, pending.clientX, pending.clientY);
  }, [updateTokenRangeFromPoint]);

  const scheduleHandleUpdate = useCallback(
    (edge: RangeEdge, clientX: number, clientY: number) => {
      pendingHandleUpdateRef.current = { edge, clientX, clientY };
      if (handleDragFrame.current === null) {
        handleDragFrame.current = requestAnimationFrame(applyPendingHandleUpdate);
      }
    },
    [applyPendingHandleUpdate]
  );

  const finishHandleDrag = useCallback(() => {
    if (handleDragFrame.current !== null) {
      cancelAnimationFrame(handleDragFrame.current);
      applyPendingHandleUpdate();
    }
    activeHandleRef.current = null;
    activePointerIdRef.current = null;
  }, [applyPendingHandleUpdate]);

  const beginHandleDrag = useCallback(
    (edge: RangeEdge, e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.pointerType !== "touch") return;
      activeHandleRef.current = edge;
      activePointerIdRef.current = e.pointerId;
      e.currentTarget.setPointerCapture(e.pointerId);
      e.stopPropagation();
    },
    []
  );

  const moveHandleDrag = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.pointerId !== activePointerIdRef.current || !activeHandleRef.current) return;
      scheduleHandleUpdate(activeHandleRef.current, e.clientX, e.clientY);
      e.stopPropagation();
    },
    [scheduleHandleUpdate]
  );

  const endHandleDrag = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.pointerId !== activePointerIdRef.current) return;
      scheduleHandleUpdate(activeHandleRef.current!, e.clientX, e.clientY);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      finishHandleDrag();
      e.stopPropagation();
    },
    [finishHandleDrag, scheduleHandleUpdate]
  );

  useEffect(
    () => () => {
      if (handleDragFrame.current !== null) cancelAnimationFrame(handleDragFrame.current);
    },
    []
  );

  const updateHandlePositions = useCallback(() => {
    if (!tokenRange || !containerRef.current) {
      setHandlePositions(null);
      return;
    }
    const start = containerRef.current.querySelector<HTMLElement>(
      `[data-token-index="${tokenRange.start}"]`
    );
    const end = containerRef.current.querySelector<HTMLElement>(
      `[data-token-index="${tokenRange.end}"]`
    );
    if (!start || !end) {
      setHandlePositions(null);
      return;
    }
    const startRect = start.getBoundingClientRect();
    const endRect = end.getBoundingClientRect();
    setHandlePositions({
      start: { left: startRect.left - 6, top: startRect.top + startRect.height / 2 },
      end: { left: endRect.right + 6, top: endRect.top + endRect.height / 2 },
    });
  }, [tokenRange]);

  useLayoutEffect(() => {
    if (!tokenRange) return;
    updateHandlePositions();
    let frame: number | null = null;
    const requestPositionUpdate = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        updateHandlePositions();
      });
    };
    window.addEventListener("resize", requestPositionUpdate);
    window.addEventListener("scroll", requestPositionUpdate, true);
    return () => {
      window.removeEventListener("resize", requestPositionUpdate);
      window.removeEventListener("scroll", requestPositionUpdate, true);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [tokenRange, updateHandlePositions]);

  useEffect(() => {
    if (!tokenRange) return;
    const onPointerDown = (e: PointerEvent) => {
      if (activePointerIdRef.current !== null) return;
      const target = e.target as HTMLElement;
      if (
        containerRef.current?.contains(target) ||
        target.closest("[data-token-selection-ui]")
      ) {
        return;
      }
      clearTokenRange();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [clearTokenRange, tokenRange]);

  const lookUpTokenRange = useCallback(() => {
    if (!tokenRange || !tokens) return;
    const text = rangeText(tokens, tokenRange);
    if (!JP_CHAR.test(text)) return;
    const anchor = containerRef.current?.querySelector<HTMLElement>(
      `[data-token-index="${tokenRange.end}"]`
    );
    setRangeLookup({
      text,
      rect: anchor?.getBoundingClientRect() ?? new DOMRect(0, 200, 50, 24),
    });
    setTokenRange(null);
    setHandlePositions(null);
  }, [tokenRange, tokens]);

  // ── Mobile: long-press → range-select ─────────────────────────────────────
  return (
    <>
      <div
        ref={containerRef}
        className={`font-jp text-lg leading-loose${
          isTouch ? " select-none [-webkit-touch-callout:none]" : ""
        }`}
        onContextMenu={isTouch ? (e) => e.preventDefault() : undefined}
      >
        {tokens && tokens.length > 0 ? (
          tokens.map((t, i) => {
            const key = `${messageId}-${i}`;
            const selected =
              tokenRange !== null && i >= tokenRange.start && i <= tokenRange.end;
            return (
              <span key={i}>
                {spaceBetween(tokens![i - 1]?.surface, t.surface) ? " " : ""}
                <span
                  data-token-index={i}
                  className={`relative inline-block align-baseline rounded ${
                    selected ? "bg-indigo-ai/20" : ""
                  }`}
                  onTouchStart={isTouch ? () => startLongPress(i) : undefined}
                  onTouchMove={isTouch ? cancelLongPress : undefined}
                  onTouchEnd={isTouch ? cancelLongPress : undefined}
                  onTouchCancel={isTouch ? cancelLongPress : undefined}
                >
                  <WordToken
                    token={t}
                    sourceMessageId={messageId}
                    savedWords={savedWords}
                    onSaved={handleSaved}
                    isOpen={openToken === key && tokenRange === null}
                    onToggle={() => {
                      if (tokenRange !== null || suppressTokenClickRef.current) return;
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

      {isTouch && tokenRange && handlePositions && typeof document !== "undefined" &&
        createPortal(
          <div data-token-selection-ui>
            <RangeHandle
              edge="start"
              position={handlePositions.start}
              onStart={beginHandleDrag}
              onMove={moveHandleDrag}
              onEnd={endHandleDrag}
            />
            <RangeHandle
              edge="end"
              position={handlePositions.end}
              onStart={beginHandleDrag}
              onMove={moveHandleDrag}
              onEnd={endHandleDrag}
            />
          </div>,
          document.body
        )}

      {tokenRange && tokens && (
        <div
          data-token-selection-ui
          className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-ai/30 bg-indigo-ai/5 px-3 py-2"
        >
          <span className="text-xs font-semibold text-indigo-ai">
            Drag the arrows to select words
          </span>
          <button
            onClick={lookUpTokenRange}
            className="rounded-full bg-indigo-ai px-3 py-1 text-xs font-bold text-white"
          >
            Look up {rangeText(tokens, tokenRange)}
          </button>
          <button
            onClick={clearTokenRange}
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

      {rangeLookup && (
        <SelectionLookupPopup
          text={rangeLookup.text}
          anchorRect={rangeLookup.rect}
          savedWords={savedWords}
          onSaved={handleSaved}
          onClose={clearTokenRange}
        />
      )}

    </>
  );
}

function RangeHandle({
  edge,
  position,
  onStart,
  onMove,
  onEnd,
}: {
  edge: RangeEdge;
  position: HandlePosition;
  onStart: (edge: RangeEdge, e: React.PointerEvent<HTMLButtonElement>) => void;
  onMove: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onEnd: (e: React.PointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Drag ${edge} of selected words`}
      className="fixed z-[10000] flex h-7 w-5 touch-none items-center justify-center rounded-full bg-indigo-ai text-xs font-black text-white shadow-lg"
      style={{ left: position.left, top: position.top, transform: "translate(-50%, -50%)" }}
      onPointerDown={(e) => onStart(edge, e)}
      onPointerMove={onMove}
      onPointerUp={onEnd}
      onPointerCancel={onEnd}
    >
      {edge === "start" ? "‹" : "›"}
    </button>
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

