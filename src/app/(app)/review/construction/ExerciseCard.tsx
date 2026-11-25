"use client";

import { Lightbulb } from "@phosphor-icons/react";
import type { GrammarConcept } from "@/lib/grammar/curriculum";
import { hintFor } from "@/lib/grammar/hints";
import type { CheckResult, GrammarExercise, GrammarResponse } from "@/lib/grammar/types";
import { AssembleInput } from "./inputs/AssembleInput";
import { CompleteInput } from "./inputs/CompleteInput";
import { ParticleInput } from "./inputs/ParticleInput";
import { ProduceInput } from "./inputs/ProduceInput";
import { TransformInput } from "./inputs/TransformInput";

const KIND_LABELS: Record<GrammarExercise["kind"], string> = {
  assemble: "Build the sentence",
  particle: "Choose the particle",
  complete: "Complete the sentence",
  transform: "Transform the sentence",
  produce: "Write it yourself",
};

type ExerciseCardProps = {
  exercise: GrammarExercise;
  concept: GrammarConcept;
  result: CheckResult | null;
  hintShown: boolean;
  familiar: boolean;
  retryKey: number;
  savedWords: Set<string>;
  onSaved: (word: string) => void;
  onToggleHint: () => void;
  onSubmit: (response: GrammarResponse) => void;
};

export function ExerciseCard({
  exercise,
  concept,
  result,
  hintShown,
  familiar,
  retryKey,
  savedWords,
  onSaved,
  onToggleHint,
  onSubmit,
}: ExerciseCardProps) {
  const disabled = result !== null;

  return (
    <div className="rounded-3xl border-2 border-sky/25 bg-sky/5 p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-sky">
          {KIND_LABELS[exercise.kind]}
        </p>
        {exercise.generated ? (
          <span
            className="rounded-lg bg-mint/15 px-2 py-0.5 text-[10px] font-extrabold text-mint"
            title="Built from a word you saved, using the template for this topic"
          >
            from your deck
          </span>
        ) : (
          familiar && (
            <span className="rounded-lg bg-mint/15 px-2 py-0.5 text-[10px] font-extrabold text-mint">
              deck words
            </span>
          )
        )}
      </div>

      {exercise.kind === "assemble" && (
        <AssembleInput key={retryKey} exercise={exercise} disabled={disabled} onSubmit={onSubmit} />
      )}
      {exercise.kind === "particle" && (
        <ParticleInput
          key={retryKey}
          exercise={exercise}
          result={result}
          savedWords={savedWords}
          onSaved={onSaved}
          onSubmit={onSubmit}
        />
      )}
      {exercise.kind === "complete" && (
        <CompleteInput
          key={retryKey}
          exercise={exercise}
          result={result}
          savedWords={savedWords}
          onSaved={onSaved}
          onSubmit={onSubmit}
        />
      )}
      {exercise.kind === "transform" && (
        <TransformInput
          key={retryKey}
          exercise={exercise}
          disabled={disabled}
          savedWords={savedWords}
          onSaved={onSaved}
          onSubmit={onSubmit}
        />
      )}
      {exercise.kind === "produce" && (
        <ProduceInput key={retryKey} exercise={exercise} disabled={disabled} onSubmit={onSubmit} />
      )}

      {!disabled && (
        <div className="mt-3 flex flex-wrap items-start gap-2 border-t border-sky/20 pt-3">
          <button
            type="button"
            onClick={onToggleHint}
            aria-expanded={hintShown}
            title="Show a hint (H)"
            className="flex items-center gap-1.5 rounded-xl border-2 border-sky/30 bg-card px-3 py-1.5 text-xs font-bold text-sky transition hover:bg-sky/10"
          >
            <Lightbulb size={13} weight="bold" />
            {hintShown ? "Hide hint" : "Hint"}
            <span className="text-[9px] font-extrabold opacity-60">H</span>
          </button>
          {hintShown && (
            <p className="max-w-prose pt-0.5 text-xs leading-relaxed text-muted">
              {hintFor(exercise, concept)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
