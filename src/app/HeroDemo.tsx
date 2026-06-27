"use client";

import { useEffect, useRef, useState } from "react";
import Kai from "./Kai";
import { demoConversation, demoHighlight, type Token } from "./demo-data";

type Saved = { reading: string; romaji: string; en: string };

export default function HeroDemo() {
  const [visibleMsgs, setVisibleMsgs] = useState(0);
  const [typing, setTyping] = useState(true);
  const [openWord, setOpenWord] = useState<string | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [autoHinted, setAutoHinted] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const t = timers.current;
    // Reveal messages one at a time, with a typing pause before each.
    let delay = 500;
    demoConversation.forEach((_, i) => {
      t.push(setTimeout(() => setTyping(true), delay));
      delay += 900;
      t.push(
        setTimeout(() => {
          setVisibleMsgs(i + 1);
          setTyping(i + 1 < demoConversation.length);
        }, delay)
      );
      delay += 700;
    });

    // After the convo finishes, auto-demo a tap + save.
    t.push(
      setTimeout(() => {
        const key = `${demoHighlight.messageIndex}-${demoHighlight.tokenIndex}`;
        setOpenWord(key);
        setAutoHinted(true);
      }, delay + 600)
    );
    t.push(
      setTimeout(() => {
        const tok =
          demoConversation[demoHighlight.messageIndex].tokens[
            demoHighlight.tokenIndex
          ];
        if (tok.word) {
          setSaved({
            reading: tok.word.reading,
            romaji: tok.word.romaji,
            en: tok.word.en,
          });
        }
        setOpenWord(null);
      }, delay + 2400)
    );

    return () => {
      t.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="relative w-full max-w-md">
      {/* chat card */}
      <div className="rounded-[1.75rem] border-2 border-border bg-card p-5 shadow-xl shadow-indigo-ai/10">
        {/* header */}
        <div className="mb-4 flex items-center gap-3 border-b-2 border-border pb-3">
          <Kai size={40} />
          <div className="leading-tight">
            <p className="font-display text-sm font-extrabold">Kai</p>
            <p className="flex items-center gap-1 text-xs text-mint">
              <span className="h-2 w-2 rounded-full bg-mint" />
              online · talks N5
            </p>
          </div>
        </div>

        {/* messages */}
        <div className="flex min-h-[180px] flex-col gap-3">
          {demoConversation.slice(0, visibleMsgs).map((msg, mi) => (
            <div key={mi} className="flex justify-start">
              <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-indigo-ai/8 px-4 py-2.5">
                <p className="font-jp text-lg leading-relaxed">
                  {msg.tokens.map((tok, ti) => (
                    <WordToken
                      key={ti}
                      tok={tok}
                      tokenKey={`${mi}-${ti}`}
                      open={openWord === `${mi}-${ti}`}
                      onToggle={(k) =>
                        setOpenWord((cur) => (cur === k ? null : k))
                      }
                    />
                  ))}
                </p>
              </div>
            </div>
          ))}

          {typing && (
            <div className="flex justify-start">
              <div className="flex gap-1 rounded-2xl rounded-bl-md bg-indigo-ai/8 px-4 py-3.5">
                <Dot delay="0ms" />
                <Dot delay="150ms" />
                <Dot delay="300ms" />
              </div>
            </div>
          )}
        </div>

        {/* fake input */}
        <div className="mt-4 flex items-center gap-2 rounded-full border-2 border-border px-4 py-2.5 text-sm text-muted">
          <span className="font-jp">こんにちは…</span>
          <span className="ml-auto flex h-7 w-7 items-center justify-center rounded-full bg-indigo-ai text-white">
            ↑
          </span>
        </div>
      </div>

      {/* tap hint */}
      {autoHinted && !saved && (
        <p className="mt-3 text-center text-xs font-semibold text-muted">
          ↑ tap a word to see what it means
        </p>
      )}

      {/* flashcard flies in */}
      {saved && (
        <div className="animate-[floatIn_0.5s_ease] absolute -right-3 -top-4 w-44 rotate-3 rounded-2xl border-2 border-mint/40 bg-card p-3 shadow-lg sm:-right-12">
          <p className="text-[10px] font-bold uppercase tracking-wide text-mint">
            ✓ saved to flashcards
          </p>
          <p className="mt-1 font-jp text-lg font-bold">{saved.reading}</p>
          <p className="text-xs text-muted">
            {saved.romaji} · {saved.en}
          </p>
        </div>
      )}
    </div>
  );
}

function WordToken({
  tok,
  tokenKey,
  open,
  onToggle,
}: {
  tok: Token;
  tokenKey: string;
  open: boolean;
  onToggle: (k: string) => void;
}) {
  if (!tok.word) return <span>{tok.t}</span>;

  return (
    <span className="relative inline-block">
      <button
        onClick={() => onToggle(tokenKey)}
        className={`rounded-md decoration-2 underline-offset-4 transition-colors ${
          open
            ? "bg-indigo-ai/15 text-indigo-ai"
            : "underline decoration-indigo-ai/30 hover:bg-indigo-ai/10"
        }`}
      >
        {tok.t}
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 z-10 mb-2 w-40 -translate-x-1/2 rounded-xl border-2 border-border bg-card p-3 text-left shadow-xl">
          <span className="block font-jp text-base font-bold text-foreground">
            {tok.word.reading}
          </span>
          <span className="block text-xs text-muted">{tok.word.romaji}</span>
          <span className="mt-1 block text-sm font-semibold text-indigo-ai">
            {tok.word.en}
          </span>
          <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-muted">
            {tok.word.pos}
          </span>
        </span>
      )}
    </span>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-2 w-2 animate-bounce rounded-full bg-indigo-ai/50"
      style={{ animationDelay: delay }}
    />
  );
}
