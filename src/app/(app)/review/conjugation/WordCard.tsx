"use client";

import { useState } from "react";
import { SpeakerHigh } from "@phosphor-icons/react";
import { canSpeak, speakJa } from "@/lib/speak";
import { patternLabel } from "@/lib/review/conjugation-patterns";
import TappableJapanese from "../components/TappableJapanese";
import type { ConjugateDrill } from "./useConjugateDrill";

const GROUP_LABELS: Record<string, string> = {
  godan: "Group 1 · Godan",
  ichidan: "Group 2 · Ichidan",
  "i-adj": "い-adjective",
  "na-adj": "な-adjective",
  suru: "Irregular · する",
  kuru: "Irregular · 来る",
  irregular: "Irregular",
};

type WordCardProps = {
  drill: ConjugateDrill;
  savedWords: Set<string>;
  onSaved: (word: string) => void;
};

export function WordCard({ drill, savedWords, onSaved }: WordCardProps) {
  const { target, conjugation, answered, wordGroup, wordForms, cardExample } = drill;
  // Optional, one tap away: remembering every definition is not a prerequisite
  // for practising the form, and the full word card is more than this needs.
  const [showMeaning, setShowMeaning] = useState(false);
  if (!target) return null;

  const hasMeaning = Boolean(target.meaning && target.meaning !== "Unknown");

  return (
    <details className="group rounded-2xl border-2 border-border bg-card px-4 py-2.5 text-sm">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 text-xs font-bold text-muted">
        <span className="font-jp text-base font-extrabold text-foreground">{target.word}</span>
        {target.reading && target.reading !== target.word && (
          <span className="font-jp text-xs text-muted">{target.reading}</span>
        )}
        {hasMeaning && (
          <button
            type="button"
            aria-expanded={showMeaning}
            title="Show the English meaning"
            onClick={(event) => {
              // Don't open the whole word card just to read the definition.
              event.preventDefault();
              event.stopPropagation();
              setShowMeaning((current) => !current);
            }}
            className="rounded-lg border border-border px-2 py-0.5 text-[10px] font-bold text-muted transition hover:text-foreground group-open:hidden"
          >
            {showMeaning ? "hide meaning" : "meaning"}
          </button>
        )}
        <span className="ml-auto rounded-lg bg-indigo-ai/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-indigo-ai">
          {target.partOfSpeech}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted group-open:hidden">
          word card
        </span>
        {showMeaning && hasMeaning && (
          <span className="w-full pt-0.5 text-[11px] font-normal leading-snug text-muted group-open:hidden">
            {target.meaning}
          </span>
        )}
      </summary>

      <div className="mt-2 space-y-2.5 text-xs text-muted">
        <div className="flex flex-wrap items-center gap-2">
          <span>{target.meaning}</span>
          {canSpeak() && (
            <button
              type="button"
              onClick={() => speakJa(target.reading || target.word)}
              className="flex h-6 w-6 items-center justify-center rounded-lg bg-foreground/5 text-foreground hover:bg-foreground/10"
              title="Pronounce word"
            >
              <SpeakerHigh size={14} />
            </button>
          )}
        </div>

        {wordGroup && (
          <p>
            <span className="font-bold text-foreground">Group</span> ·{" "}
            {GROUP_LABELS[wordGroup] ?? wordGroup}
          </p>
        )}

        {wordForms.length > 0 && (
          <div>
            <p className="font-bold text-foreground">Conjugations</p>
            <div className="mt-1 grid gap-1 sm:grid-cols-2">
              {wordForms
                .filter((form) => answered || form.formType !== conjugation?.formType)
                .map((form) => (
                  <div
                    key={form.formType}
                    className="flex items-center justify-between gap-2 rounded-lg bg-foreground/5 px-2 py-1"
                  >
                    <span>{patternLabel(form.formType)}</span>
                    <span className="font-jp text-foreground">{form.form}</span>
                  </div>
                ))}
            </div>
            {!answered && (
              <p className="mt-1 text-[10px]">
                The form being practised here stays hidden until you answer.
              </p>
            )}
          </div>
        )}

        {cardExample && (
          <div>
            <p className="font-bold text-foreground">Example · {cardExample.label}</p>
            <p className="text-foreground">
              <TappableJapanese
                text={cardExample.fullAnswer}
                savedWords={savedWords}
                onSaved={onSaved}
                messageContent={cardExample.fullAnswer}
                readings={cardExample.readings}
              />
            </p>
            <p>{cardExample.promptEn}</p>
          </div>
        )}
      </div>
    </details>
  );
}
