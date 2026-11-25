"use client";

import { useEffect, useMemo, useState } from "react";
import { SelectionLookupPopup } from "../../chat/SelectionLookupPopup";

const JP_CHAR = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;
const JP_RUN = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFFー々]+/g;

type Segment = { text: string; jp: boolean };

/** Word-level segmentation for tap-to-define; mirrors chat's fallback text. */
function segment(text: string): Segment[] {
  const Segmenter = (
    Intl as unknown as {
      Segmenter?: new (
        loc?: string,
        opts?: { granularity?: string }
      ) => { segment: (s: string) => Iterable<{ segment: string }> };
    }
  ).Segmenter;

  if (Segmenter) {
    try {
      const segmenter = new Segmenter("ja", { granularity: "word" });
      const out: Segment[] = [];
      for (const { segment: piece } of segmenter.segment(text)) {
        const jp = JP_CHAR.test(piece);
        const prev = out[out.length - 1];
        if (!jp && prev && !prev.jp) prev.text += piece;
        else out.push({ text: piece, jp });
      }
      return out;
    } catch {
      // Fall through to Japanese-run splitting.
    }
  }

  const parts: Segment[] = [];
  let last = 0;
  for (const match of text.matchAll(JP_RUN)) {
    const start = match.index ?? 0;
    if (start > last) parts.push({ text: text.slice(last, start), jp: false });
    parts.push({ text: match[0], jp: true });
    last = start + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), jp: false });
  return parts;
}

const EMPTY_SAVED = new Set<string>();

/**
 * Japanese sentence text where every word opens the same dictionary/AI lookup
 * popup used in chat. Used inside Fill the blank prompts and feedback.
 */
export default function TappableJapanese({
  text,
  className = "",
  savedWords = EMPTY_SAVED,
  onSaved,
  messageContent,
  readings,
}: {
  text: string;
  className?: string;
  savedWords?: Set<string>;
  onSaved?: (word: string) => void;
  /** Full sentence, so AI fallback can use context for a single word. */
  messageContent?: string;
  /** Optional ruby readings, keyed by the exact word as rendered. */
  readings?: Record<string, string>;
}) {
  const parts = useMemo(() => segment(text), [text]);
  const [selected, setSelected] = useState<{
    key: string;
    text: string;
    rect: DOMRect;
  } | null>(null);

  // The sentence changes with the next exercise; don't leave an old popup open.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(null);
  }, [text]);

  return (
    <span className={`font-jp ${className}`}>
      {parts.map((part, index) => {
        if (!part.jp || !JP_CHAR.test(part.text)) {
          return <span key={index}>{part.text}</span>;
        }
        const key = `${index}:${part.text}`;
        const active = selected?.key === key;
        const ruby = readings?.[part.text];
        return (
          <button
            key={key}
            type="button"
            aria-label={`Look up ${part.text}`}
            title={`Look up ${part.text}`}
            onClick={(event) => {
              setSelected({
                key,
                text: part.text,
                rect: event.currentTarget.getBoundingClientRect(),
              });
            }}
            className={`inline-block rounded align-baseline decoration-2 underline-offset-4 transition-colors ${
              active
                ? "bg-indigo-ai/15 text-indigo-ai"
                : "underline decoration-indigo-ai/25 hover:bg-indigo-ai/10"
            }`}
          >
            {ruby ? (
              <ruby>
                {part.text}
                <rt className="text-[0.5em] font-normal leading-none text-muted">{ruby}</rt>
              </ruby>
            ) : (
              part.text
            )}
          </button>
        );
      })}

      {selected && (
        <SelectionLookupPopup
          text={selected.text}
          anchorRect={selected.rect}
          savedWords={savedWords}
          onSaved={onSaved ?? (() => {})}
          onClose={() => setSelected(null)}
          messageContent={messageContent ?? text}
          singleWord
        />
      )}
    </span>
  );
}
