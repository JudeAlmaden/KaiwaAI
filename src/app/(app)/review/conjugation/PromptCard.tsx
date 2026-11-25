"use client";

import { STAGE_NAMES } from "@/lib/review/conjugation-mastery";
import TappableJapanese from "../components/TappableJapanese";
import type { ConjugateDrill } from "./useConjugateDrill";

type PromptCardProps = {
  drill: ConjugateDrill;
  savedWords: Set<string>;
  onSaved: (word: string) => void;
};

export function PromptCard({ drill, savedWords, onSaved }: PromptCardProps) {
  const { target, conjugation, picked, typedResult, patternCorrect, draft } = drill;
  if (!target || !conjugation) return null;

  return (
    <div className="rounded-3xl border-2 border-mint/30 bg-mint/5 p-5">
      {/* The name only: the stage is derived from your answers, so numbering
          it made it read like a course instead of an adaptive format. */}
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-mint">
        {STAGE_NAMES[conjugation.stage]}
      </p>

      {conjugation.stage === 3 ? (
        <>
          <p className="mt-3 text-3xl font-extrabold text-foreground">
            <TappableJapanese
              text={target.word}
              savedWords={savedWords}
              onSaved={onSaved}
              messageContent={target.word}
            />
          </p>
          <p className="mt-1 text-xs text-muted">
            {target.reading} · {conjugation.label}
          </p>
          <p className="mt-3 text-sm font-bold text-foreground">
            Make the {conjugation.label.toLowerCase()} form.
          </p>
        </>
      ) : (
        <>
          <p className="mt-3 text-2xl font-extrabold leading-relaxed text-foreground">
            <TappableJapanese
              text={conjugation.before}
              savedWords={savedWords}
              onSaved={onSaved}
              messageContent={conjugation.fullAnswer}
              readings={conjugation.readings}
            />{" "}
            <span
              className={
                picked === null && typedResult === null
                  ? "font-jp text-mint"
                  : patternCorrect
                    ? "font-jp text-mint"
                    : "font-jp text-rose-500"
              }
            >
              {picked ?? (conjugation.mode === "typed" && draft ? draft : "＿＿")}
            </span>{" "}
            <TappableJapanese
              text={conjugation.after}
              savedWords={savedWords}
              onSaved={onSaved}
              messageContent={conjugation.fullAnswer}
              readings={conjugation.readings}
            />
          </p>
          {conjugation.stage === 4 && (
            <p className="mt-2 text-xs text-muted">
              {conjugation.register} · {conjugation.promptEn}
            </p>
          )}
        </>
      )}
    </div>
  );
}
