"use client";

import { BookBookmark } from "@phosphor-icons/react";
import type { KanjiDetail } from "./types";

interface KanjiDetailsBodyProps {
  kanjiData: KanjiDetail;
  hasHeisig: boolean;
}

export default function KanjiDetailsBody({
  kanjiData,
  hasHeisig,
}: KanjiDetailsBodyProps) {
  return (
    <>
      {/* 1. HEISIG RTK HERO BANNER */}
      {hasHeisig && (
        <div className="rounded-2xl border-2 border-amber/30 bg-gradient-to-br from-amber/10 via-card to-card p-3.5 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-extrabold text-amber flex items-center gap-1">
              <BookBookmark size={14} weight="fill" />
              <span>Remembering the Kanji</span>
            </span>
            <div className="flex items-center gap-1.5">
              {kanjiData.heisigNumber && (
                <span className="rounded-md bg-amber/20 px-2 py-0.5 text-[11px] font-extrabold text-amber">
                  Frame #{kanjiData.heisigNumber}
                </span>
              )}
              {kanjiData.heisigLesson && (
                <span className="rounded-md bg-indigo-ai/15 px-2 py-0.5 text-[11px] font-extrabold text-indigo-ai">
                  Lesson {kanjiData.heisigLesson}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-muted font-bold">RTK Canonical Keyword:</span>
            <span className="text-sm font-extrabold text-foreground tracking-tight">
              {kanjiData.heisigKeyword || kanjiData.meanings[0]}
            </span>
          </div>
        </div>
      )}

      {/* 2. DEFAULT DICTIONARY MEANINGS */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted">
          {hasHeisig ? "Dictionary Meanings (JMDict)" : "Meanings"}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {kanjiData.meanings.map((m, i) => (
            <span
              key={i}
              className={`rounded-xl px-2.5 py-1 text-xs font-bold ${
                !hasHeisig && i === 0
                  ? "bg-indigo-ai text-white shadow-xs"
                  : "bg-card border border-border text-foreground"
              }`}
            >
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* 3. READINGS (ON & KUN) */}
      <div className="rounded-2xl border border-border/80 bg-card/60 p-3 space-y-2 text-xs">
        {kanjiData.readingsOn.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky shrink-0">
              音 (On)
            </span>
            <div className="flex flex-wrap gap-1">
              {kanjiData.readingsOn.map((r, i) => (
                <span
                  key={i}
                  className="font-jp rounded-lg bg-sky/15 px-2.5 py-0.5 text-xs font-semibold text-sky"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}
        {kanjiData.readingsKun.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber shrink-0">
              訓 (Kun)
            </span>
            <div className="flex flex-wrap gap-1">
              {kanjiData.readingsKun.map((r, i) => (
                <span
                  key={i}
                  className="font-jp rounded-lg bg-amber/15 px-2.5 py-0.5 text-xs font-semibold text-amber"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. PRIMITIVES & RADICALS */}
      {kanjiData.radicals && kanjiData.radicals.length > 0 && (
        <div className="rounded-2xl border border-border/80 bg-card/60 p-3 space-y-1.5">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted">
            {hasHeisig ? "Heisig Primitives & Radicals" : "Radical Components"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {kanjiData.radicals.map((radical, i) => (
              <span
                key={i}
                className="rounded-lg bg-indigo-ai/10 border border-indigo-ai/20 px-2.5 py-0.5 text-xs font-bold text-indigo-ai"
              >
                {radical}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
