"use client";

import React from "react";
import {
  ArrowClockwise,
  SmileySad,
  CheckCircle,
  Smiley,
  SpeakerHigh,
  Lightbulb,
} from "@phosphor-icons/react";
import { speakJa, canSpeak } from "@/lib/speak";
import { formLabel } from "@/lib/form-label";
import Furigana from "./Furigana";
import KanjiBreakdown from "../chat/KanjiBreakdown";

export type Card = {
  id: string;
  type?: "vocabulary" | "kanji";
  word?: string;
  reading?: string;
  romaji?: string;
  meaning?: string;
  partOfSpeech?: string;
  formType?: string | null;
  dictionary?: string | null;
  note?: string | null;
  character?: string;
  meanings?: string[];
  readingsOn?: string[];
  readingsKun?: string[];
  radicals?: string[];
  mnemonic?: string;
  status?: "new" | "learning" | "known";
};

export const GRADES = [
  { grade: 0, label: "Again", key: "1", color: "bg-sakura text-white border-b-4 border-sakura/80", icon: ArrowClockwise },
  { grade: 1, label: "Hard", key: "2", color: "bg-amber-500 text-white border-b-4 border-amber-600", icon: SmileySad },
  { grade: 2, label: "Good", key: "3", color: "bg-indigo-ai text-white border-b-4 border-indigo-deep", icon: CheckCircle },
  { grade: 3, label: "Easy", key: "4", color: "bg-emerald-500 text-white border-b-4 border-emerald-600", icon: Smiley },
];

export interface ReviewCardProps {
  card: Card & { _dir?: "jp-to-en" | "en-to-jp" };
  reviewType?: "vocabulary" | "kanji" | "mixed";
  flipped: boolean;
  onFlip: () => void;
  onGrade: (grade: number) => void;
  showHint?: boolean;
  generatingMnemonic?: boolean;
  onToggleHint?: () => void;
  onGenerateMnemonic?: (isRegenerate: boolean) => void;
}

export default function ReviewCard({
  card,
  reviewType = "vocabulary",
  flipped,
  onFlip,
  onGrade,
  showHint = false,
  generatingMnemonic = false,
  onToggleHint,
  onGenerateMnemonic,
}: ReviewCardProps) {
  const cardType = card.type || reviewType;
  const isVocab = cardType === "vocabulary";
  const isJpToEn = card._dir ? card._dir === "jp-to-en" : true;

  const frontContent = isJpToEn
    ? (isVocab ? card.word : card.character)
    : (isVocab ? card.meaning : card.meanings?.[0]);

  const backContent = isVocab
    ? {
        japanese: card.word,
        reading: card.reading,
        romaji: card.romaji,
        english: card.meaning,
        meta: card.partOfSpeech || "Vocabulary",
        mnemonic: undefined as string | undefined,
      }
    : {
        japanese: card.character,
        reading: [...(card.readingsOn || []), ...(card.readingsKun || [])].join(", "),
        romaji: "",
        english: card.meanings?.join(", "),
        meta: "Kanji",
        mnemonic: card.mnemonic,
      };

  const backFace = (
    <>
      {isJpToEn ? (
        <>
          {backContent.reading && (
            <p className="font-jp text-2xl font-bold text-indigo-ai">{backContent.reading}</p>
          )}
          {backContent.romaji && <p className="text-xs text-muted mt-0.5">{backContent.romaji}</p>}
          <p className="mt-2.5 text-xl font-bold text-foreground">{backContent.english}</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-muted font-display">
            {backContent.meta}
          </p>
          {isVocab && formLabel(card.formType) && card.dictionary && (
            <p className="mt-2 text-xs font-semibold text-indigo-ai">
              {formLabel(card.formType)} · base: <span className="font-jp">{card.dictionary}</span>
            </p>
          )}
          {isVocab && card.word && <KanjiBreakdown word={card.word} />}
          {!isVocab && card.radicals && card.radicals.length > 0 && (
            <div className="mt-3 rounded-2xl bg-surface/50 px-3 py-2 w-full">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted font-display">Radicals</p>
              <div className="mt-1.5 flex flex-wrap justify-center gap-1.5">
                {card.radicals.map((radical, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`/kanji?search=${encodeURIComponent(radical)}`, "_blank");
                    }}
                    className="rounded-full bg-indigo-ai/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-ai transition-all hover:bg-indigo-ai/30 hover:scale-105"
                    title={`Search for ${radical}`}
                  >
                    {radical}
                  </button>
                ))}
              </div>
            </div>
          )}
          {!isVocab && backContent.mnemonic && (
            <div className="mt-3 rounded-2xl border-2 border-mint/30 bg-mint/5 px-3 py-2 text-left w-full">
              <p className="text-[10px] font-bold uppercase tracking-wide text-mint font-display flex items-center gap-1">
                <Lightbulb size={12} /> Mnemonic
              </p>
              <p className="mt-1 text-xs text-foreground leading-relaxed">{backContent.mnemonic}</p>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="font-jp text-4xl font-bold text-indigo-ai">{backContent.japanese}</p>
          {backContent.reading && (
            <p className="mt-2 text-sm font-jp text-muted">{backContent.reading}</p>
          )}
          {isVocab && formLabel(card.formType) && card.dictionary && (
            <p className="mt-2 text-xs font-semibold text-indigo-ai">
              {formLabel(card.formType)} · base: <span className="font-jp">{card.dictionary}</span>
            </p>
          )}
          {!isVocab && backContent.mnemonic && (
            <div className="mt-3 rounded-2xl border-2 border-mint/30 bg-mint/5 px-3 py-2 text-left w-full">
              <p className="text-[10px] font-bold uppercase tracking-wide text-mint font-display flex items-center gap-1">
                <Lightbulb size={12} /> Mnemonic
              </p>
              <p className="mt-1 text-xs text-foreground leading-relaxed">{backContent.mnemonic}</p>
            </div>
          )}
        </>
      )}
    </>
  );

  return (
    <div className="flex flex-col items-center justify-center gap-6 w-full max-w-md">
      <div className="card-perspective w-full h-[380px] sm:h-[420px]">
        <div
          onClick={onFlip}
          className={`card-inner cursor-pointer ${flipped ? "is-flipped" : ""}`}
        >
          <div className="card-front select-none">
            {canSpeak() && isJpToEn && backContent.japanese && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  speakJa(backContent.japanese || "");
                }}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-indigo-ai/10 text-indigo-ai hover:bg-indigo-ai/20 transition-colors"
                title="Hear audio"
              >
                <SpeakerHigh size={18} />
              </button>
            )}
            <span className={`font-bold ${isJpToEn ? "font-jp text-5xl" : "text-3xl"}`}>
              {isJpToEn && isVocab && card.word && card.reading ? (
                <Furigana word={card.word} reading={card.reading} className="text-5xl" />
              ) : (
                frontContent
              )}
            </span>
            {isVocab && formLabel(card.formType) && (
              <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-indigo-ai font-display">
                {formLabel(card.formType)}
              </p>
            )}
            {!isVocab && card.radicals && card.radicals.length > 0 && (
              <div className="mt-4 w-full" onClick={(e) => e.stopPropagation()}>
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted font-display text-center">
                  Radicals
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {card.radicals.map((radical, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/kanji?search=${encodeURIComponent(radical)}`, "_blank");
                      }}
                      className="rounded-full bg-indigo-ai/20 px-3 py-1 text-xs font-semibold text-indigo-ai transition-all hover:bg-indigo-ai/30 hover:scale-105"
                      title={`Search for ${radical}`}
                    >
                      {radical}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-5 text-xs text-muted/80">Tap or press Space to flip</p>
            {!isVocab && onToggleHint && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleHint();
                }}
                disabled={generatingMnemonic}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border-2 border-mint/30 bg-mint/5 px-4 py-2 text-xs font-bold text-mint transition-colors hover:bg-mint/10 disabled:opacity-50"
              >
                <Lightbulb size={14} />
                <span>{generatingMnemonic ? "Generating..." : showHint ? "Hide hint" : "Show hint"}</span>
              </button>
            )}
            {showHint && !isVocab && card.mnemonic && (
              <div className="mt-3 w-full space-y-2" onClick={(e) => e.stopPropagation()}>
                <div className="rounded-2xl border-2 border-mint/30 bg-mint/5 px-3 py-2 text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-mint font-display flex items-center gap-1">
                    <Lightbulb size={12} /> Mnemonic
                  </p>
                  <p className="mt-1 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                    {card.mnemonic}
                  </p>
                </div>
                {onGenerateMnemonic && (
                  <button
                    type="button"
                    onClick={() => onGenerateMnemonic(true)}
                    disabled={generatingMnemonic}
                    className="w-full inline-flex items-center justify-center gap-1 rounded-full border-2 border-mint/30 bg-mint/10 px-3 py-1.5 text-xs font-bold text-mint transition-all hover:bg-mint/20 disabled:opacity-50"
                  >
                    <ArrowClockwise size={12} />
                    <span>{generatingMnemonic ? "Regenerating..." : "Regenerate"}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="card-back">
            <div className="card-back-scroll" onClick={(e) => e.stopPropagation()}>
              {backFace}
            </div>
          </div>
        </div>
      </div>

      {flipped ? (
        <div className="grid w-full max-w-md grid-cols-4 gap-2.5">
          {GRADES.map((g) => {
            const Icon = g.icon;
            return (
              <button
                key={g.grade}
                type="button"
                onClick={() => onGrade(g.grade)}
                className={`flex flex-col items-center justify-center rounded-2xl py-3 text-sm font-bold shadow-sm transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-[2px] ${g.color}`}
              >
                <Icon size={18} className="mb-0.5" />
                <span>{g.label}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm font-medium text-muted">
          {isJpToEn ? "What does this mean?" : "How do you say this in Japanese?"}
        </p>
      )}
    </div>
  );
}
