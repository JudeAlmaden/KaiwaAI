"use client";

import { useState } from "react";
import WordToken from "./WordToken";
import LookupToken from "./LookupToken";
import { hasFeedback, type CachedToken, type Correction } from "@/lib/types";

const JP_CHAR = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;

// Match runs of Japanese (kana/kanji + long-vowel mark) so each "word-ish" run
// is individually tappable when a message has no cached tokens.
const JP_RUN = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFFー々]+/g;

/** Spacing between rendered tokens (Japanese has no spaces; English does). */
function spaceBetween(prev: string | undefined, curr: string): boolean {
  if (!prev) return false;
  if (JP_CHAR.test(prev) || JP_CHAR.test(curr)) return false;
  if (/^[!?.,)\]}」』）、。…:;%]/.test(curr)) return false;
  if (/[([{「『（]$/.test(prev)) return false;
  return true;
}

/** Renders an AI message body with tap-to-translate tokens, an English toggle,
 *  and a grammar-correction card. Shared by Kai's 1:1 chat and group chats. */
export function RichKaiText({
  content,
  tokensJson,
  english,
  correctionJson,
  messageId,
}: {
  content: string;
  tokensJson?: string | null;
  english?: string | null;
  correctionJson?: string | null;
  messageId: string;
}) {
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [openToken, setOpenToken] = useState<string | null>(null);

  let tokens: CachedToken[] | null = null;
  if (tokensJson) {
    try {
      tokens = JSON.parse(tokensJson);
    } catch {
      tokens = null;
    }
  }

  return (
    <>
      <p className="font-jp text-lg leading-loose">
        {tokens && tokens.length > 0 ? (
          tokens.map((t, i) => {
            const key = `${messageId}-${i}`;
            return (
              <span key={i}>
                {spaceBetween(tokens![i - 1]?.surface, t.surface) ? " " : ""}
                <WordToken
                  token={t}
                  sourceMessageId={messageId}
                  savedWords={savedWords}
                  onSaved={(w) => setSavedWords((s) => new Set(s).add(w))}
                  isOpen={openToken === key}
                  onToggle={() =>
                    setOpenToken((cur) => (cur === key ? null : key))
                  }
                />
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
      </p>
      {english && <EnglishToggle text={english} />}
      {correctionJson && <CorrectionCard raw={correctionJson} />}
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
        <p className="text-sm text-muted">{text}</p>
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
      <p
        className={`mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${
          incorrect ? "text-sakura" : "text-amber"
        }`}
      >
        <span>✏️</span>
        {incorrect ? "Correction" : "More natural"}
      </p>
      {c.explanation && <p className="text-muted">{c.explanation}</p>}
      {c.corrected && (
        <p className="mt-1 font-jp text-base">
          {c.corrected}
          {c.romaji && <span className="ml-2 text-xs text-muted">{c.romaji}</span>}
        </p>
      )}
      {c.natural && c.natural !== c.corrected && (
        <p className="mt-1 text-xs text-muted">
          More natural: <span className="font-jp">{c.natural}</span>
        </p>
      )}
    </div>
  );
}
