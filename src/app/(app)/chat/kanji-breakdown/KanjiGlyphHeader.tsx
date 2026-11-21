"use client";

import { canSpeak, speakJa } from "@/lib/speak";
import { BookBookmark, SpeakerHigh, X } from "@phosphor-icons/react";
import type { KanjiDetail } from "./types";

interface KanjiGlyphHeaderProps {
  selectedKanji: string;
  kanjiData: KanjiDetail | null;
  hasHeisig: boolean;
  primaryKeyword: string;
  onClose: () => void;
}

export default function KanjiGlyphHeader({
  selectedKanji,
  kanjiData,
  hasHeisig,
  primaryKeyword,
  onClose,
}: KanjiGlyphHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-4 mb-4">
      <div className="flex items-center gap-4 min-w-0">
        <div className="font-jp text-5xl sm:text-6xl font-extrabold leading-none text-foreground shrink-0">
          {selectedKanji}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {hasHeisig ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber/15 border border-amber/30 px-2.5 py-0.5 text-[10px] font-extrabold text-amber">
                <BookBookmark size={11} weight="fill" />
                <span>Heisig RTK</span>
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                Kanji Breakdown
              </span>
            )}
            {kanjiData?.jlptLevel && (
              <span className="rounded-full bg-indigo-ai/10 border border-indigo-ai/20 px-2 py-0.5 text-[10px] font-bold text-indigo-ai">
                JLPT N{kanjiData.jlptLevel}
              </span>
            )}
            {kanjiData?.strokes && (
              <span className="rounded-full bg-border/80 px-2 py-0.5 text-[10px] font-semibold text-muted">
                {kanjiData.strokes} strokes
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="font-display text-lg sm:text-xl font-extrabold text-foreground truncate">
              {primaryKeyword}
            </h3>
            {kanjiData?.customMeaning && (
              <span className="text-[10px] font-bold text-mint bg-mint/15 border border-mint/30 px-1.5 py-0.5 rounded-md">
                Custom
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {canSpeak() && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              speakJa(selectedKanji);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-sky/30 bg-sky/10 text-sky hover:bg-sky/20 transition-colors"
            title="Pronounce Kanji"
            aria-label="Pronounce Kanji"
          >
            <SpeakerHigh size={16} weight="bold" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-border text-muted hover:border-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X size={15} weight="bold" />
        </button>
      </div>
    </div>
  );
}
