"use client";

import { SpeakerHigh } from "@phosphor-icons/react";
import { canSpeak, speakJa } from "@/lib/speak";
import type { GrammarConcept } from "@/lib/grammar/curriculum";
import { conjugationFor } from "@/lib/grammar/hints";
import type { CheckResult, GrammarExercise } from "@/lib/grammar/types";
import TappableJapanese from "../components/TappableJapanese";

type FeedbackPanelProps = {
  exercise: GrammarExercise;
  concept: GrammarConcept;
  result: CheckResult;
  hintShown: boolean;
  misses: number;
  savedWords: Set<string>;
  onSaved: (word: string) => void;
  onNext: () => void;
  onRetry: () => void;
  onFocusConcept: (conceptId: string) => void;
};

export function FeedbackPanel({
  exercise,
  concept,
  result,
  hintShown,
  misses,
  savedWords,
  onSaved,
  onNext,
  onRetry,
  onFocusConcept,
}: FeedbackPanelProps) {
  const breakdown = conjugationFor(exercise);
  const english = exercise.en ?? (exercise.kind === "transform" ? exercise.fromEn : null);

  return (
    <div className="space-y-3">
      <div
        role="status"
        aria-live="polite"
        className={`space-y-2 rounded-2xl border-2 p-4 ${
          result.correct ? "border-mint/40 bg-mint/10" : "border-rose-500/30 bg-rose-500/5"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-extrabold text-foreground">
              {result.correct
                ? "✓ Correct"
                : misses > 1
                  ? "Still not right — let's break it down"
                  : "Not quite — here's the rule"}
            </p>
            <p className="mt-1 text-lg text-foreground">
              <TappableJapanese
                text={result.expected}
                savedWords={savedWords}
                onSaved={onSaved}
                messageContent={result.expected}
              />
            </p>
            {english && <p className="mt-0.5 text-xs text-muted">{english}</p>}
            {!result.correct && result.mistake && (
              <p className="mt-1 text-xs font-bold text-rose-500">{result.mistake}</p>
            )}
            {result.correct && hintShown && (
              <p className="mt-1 text-xs font-bold text-sky">
                You used a hint — remember the rule, not just the answer.
              </p>
            )}
          </div>
          {canSpeak() && (
            <button
              type="button"
              onClick={() => speakJa(result.expected)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-foreground/5 text-foreground transition-colors hover:bg-foreground/10"
              title="Listen to the answer"
            >
              <SpeakerHigh size={16} />
            </button>
          )}
        </div>

        {breakdown && exercise.kind === "transform" && (
          <div className="rounded-xl border border-border/60 bg-card/70 p-3 text-xs text-muted">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-sky">
              Conjugation breakdown · {breakdown.form}
            </p>
            <p className="mt-1 font-jp text-sm font-bold text-foreground">
              {exercise.from} → {exercise.answer}
            </p>
            <ul className="mt-1 space-y-0.5">
              {breakdown.steps.map((step) => (
                <li key={step}>· {step}</li>
              ))}
            </ul>
            {breakdown.examples && breakdown.examples.length > 0 && (
              <p className="mt-1.5">
                <span className="font-bold text-foreground">Similar: </span>
                {breakdown.examples.map((example, at) => (
                  <span key={example.ja} className="font-jp">
                    {at > 0 ? " · " : ""}
                    {example.ja}
                  </span>
                ))}
              </p>
            )}
          </div>
        )}

        <div className="space-y-1.5 border-t border-border/60 pt-2 text-xs text-muted">
          <p className="font-bold text-foreground">{exercise.rule}</p>
          {exercise.structure && exercise.structure.length > 0 && (
            <ul className="space-y-0.5">
              {exercise.structure.map((part) => (
                <li key={part}>· {part}</li>
              ))}
            </ul>
          )}
          {exercise.highlights?.map((highlight) => (
            <p key={`${highlight.token}-${highlight.note}`}>
              <span className="font-jp font-bold text-foreground">{highlight.token}</span> —{" "}
              {highlight.note}
            </p>
          ))}
        </div>

        {!result.correct && misses > 1 && (
          <div className="space-y-1 border-t border-border/60 pt-2 text-xs text-muted">
            <p className="font-bold text-foreground">How {concept.title.toLowerCase()} works</p>
            <ul className="space-y-0.5">
              {concept.teaches.map((line) => (
                <li key={line}>· {line}</li>
              ))}
            </ul>
            {hintShown && (
              <p className="pt-0.5 font-bold text-sky">
                Your hint pointed at the decision above — read the steps once more, then try again.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="sticky bottom-20 z-20 flex flex-wrap items-center gap-2 rounded-2xl border-2 border-border bg-card/95 p-2 backdrop-blur">
        <button
          onClick={onNext}
          className="rounded-2xl bg-sky px-5 py-2.5 text-sm font-extrabold text-white hover:bg-sky/90"
        >
          Next exercise →
        </button>
        {!result.correct && (
          <>
            <button
              onClick={onRetry}
              className="rounded-2xl border-2 border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground hover:bg-surface"
            >
              Try again
            </button>
            <button
              onClick={() => onFocusConcept(exercise.concept)}
              className="rounded-2xl border-2 border-sky/30 bg-sky/5 px-4 py-2.5 text-sm font-bold text-sky hover:bg-sky/10"
            >
              Focus this topic
            </button>
          </>
        )}
      </div>
    </div>
  );
}
