"use client";

import { SpeakerHigh } from "@phosphor-icons/react";
import { canSpeak, speakJa } from "@/lib/speak";
import TappableJapanese from "../components/TappableJapanese";
import type { ConjugateDrill } from "./useConjugateDrill";

type ConjugateFeedbackProps = {
  drill: ConjugateDrill;
  savedWords: Set<string>;
  onSaved: (word: string) => void;
};

export function ConjugateFeedback({ drill, savedWords, onSaved }: ConjugateFeedbackProps) {
  const {
    conjugation,
    patternCorrect,
    mistake,
    picked,
    draft,
    verbosity,
    otherExplanations,
    hintsUsed,
    hintLevel,
  } = drill;

  if (!conjugation) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`space-y-2 rounded-2xl border-2 p-4 ${
        patternCorrect ? "border-mint/40 bg-mint/10" : "border-rose-500/30 bg-rose-500/5"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-extrabold text-foreground">
            {patternCorrect ? "✓ Correct" : "Not quite — here's the rule"}
          </p>
          <p className="mt-1 text-lg text-foreground">
            <TappableJapanese
              text={conjugation.fullAnswer}
              savedWords={savedWords}
              onSaved={onSaved}
              messageContent={conjugation.fullAnswer}
              readings={conjugation.readings}
            />
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {conjugation.answer}
            {conjugation.answerReading !== conjugation.answer
              ? ` · ${conjugation.answerReading}`
              : ""}
          </p>
          {conjugation.translation && (
            <p className="mt-1 text-sm text-muted">
              <span className="text-[10px] font-extrabold uppercase tracking-wide">
                Translation
              </span>{" "}
              {conjugation.translation}
            </p>
          )}
          {mistake && (
            <p className="mt-1 text-xs font-bold text-rose-500">
              {picked ? `You chose ${picked}` : `You wrote ${draft.trim()}`} — {mistake}
            </p>
          )}
        </div>
        {canSpeak() && (
          <button
            type="button"
            onClick={() => speakJa(conjugation.fullAnswer)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-foreground/5 text-foreground transition-colors hover:bg-foreground/10"
            title="Listen to the sentence"
          >
            <SpeakerHigh size={16} />
          </button>
        )}
      </div>

      <div className="space-y-1.5 border-t border-border/60 pt-2 text-xs text-muted">
        <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted">
          Conjugation breakdown
        </p>
        <p className="font-bold text-foreground">{conjugation.explanation.headline}</p>
        {conjugation.explanation.transform && (
          <p className="font-jp text-amber">{conjugation.explanation.transform}</p>
        )}
        {verbosity !== "brief" && (
          <ul className="space-y-0.5">
            {conjugation.explanation.steps.map((step) => (
              <li key={step}>· {step}</li>
            ))}
          </ul>
        )}
        {verbosity !== "brief" && conjugation.explanation.examples.length > 0 && (
          <div className="pt-1">
            <p className="font-bold text-foreground">Other examples</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {conjugation.explanation.examples.map((example) => (
                <span
                  key={`${example.from}-${example.to}`}
                  className="rounded-lg bg-foreground/5 px-2 py-0.5 font-jp text-foreground"
                >
                  {example.from} → {example.to}
                </span>
              ))}
            </div>
          </div>
        )}
        {verbosity === "detailed" &&
          conjugation.stage >= 2 &&
          otherExplanations.length > 0 && (
            <ul className="space-y-0.5 pt-1">
              {otherExplanations.map((other) => (
                <li key={other.form}>
                  <span className="font-jp font-bold text-foreground">{other.form}</span> —{" "}
                  {other.why}
                </li>
              ))}
            </ul>
          )}
        {hintsUsed && (
          <p className="text-[10px] font-bold text-amber">
            You used {hintLevel} hint{hintLevel === 1 ? "" : "s"} — remember this rule for the next
            word.
          </p>
        )}
      </div>
    </div>
  );
}
