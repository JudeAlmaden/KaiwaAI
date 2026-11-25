"use client";

import { useState } from "react";
import type { CheckResult, ParticleExercise } from "@/lib/grammar/types";
import TappableJapanese from "../../components/TappableJapanese";

type ParticleInputProps = {
  exercise: ParticleExercise;
  result: CheckResult | null;
  savedWords: Set<string>;
  onSaved: (word: string) => void;
  onSubmit: (option: string) => void;
};

export function ParticleInput({
  exercise,
  result,
  savedWords,
  onSaved,
  onSubmit,
}: ParticleInputProps) {
  const [chosen, setChosen] = useState<string | null>(null);

  function choose(option: string) {
    setChosen(option);
    onSubmit(option);
  }

  return (
    <>
      <p className="mt-2 text-sm font-bold text-muted">{exercise.en}</p>
      <p className="mt-2 text-2xl font-extrabold leading-relaxed text-foreground">
        <TappableJapanese
          text={exercise.before}
          savedWords={savedWords}
          onSaved={onSaved}
          messageContent={exercise.ja}
        />
        <span className="mx-1 inline-block min-w-8 border-b-2 border-sky text-center text-sky">
          {chosen && result ? chosen : "＿"}
        </span>
        <TappableJapanese
          text={exercise.after}
          savedWords={savedWords}
          onSaved={onSaved}
          messageContent={exercise.ja}
        />
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {exercise.options.map((option) => {
          const isAnswer = option === exercise.answer;
          const picked = chosen === option && result !== null;
          const style =
            result === null
              ? "border-border bg-card hover:border-sky/50 hover:bg-sky/5"
              : isAnswer
                ? "border-mint bg-mint/15"
                : picked
                  ? "border-rose-500/50 bg-rose-500/10"
                  : "border-border bg-card opacity-50";
          return (
            <button
              key={option}
              type="button"
              disabled={result !== null}
              onClick={() => choose(option)}
              className={`rounded-2xl border-2 px-4 py-3 font-jp text-lg font-extrabold text-foreground transition ${style}`}
            >
              {option}
              {result !== null && isAnswer && <span className="ml-1 text-mint">✓</span>}
              {picked && !isAnswer && <span className="ml-1 text-rose-500">✕</span>}
            </button>
          );
        })}
      </div>
    </>
  );
}
