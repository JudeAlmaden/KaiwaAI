"use client";

import type { ProductionExercise } from "@/lib/grammar/types";
import { TypedAnswer } from "./TypedAnswer";

type ProduceInputProps = {
  exercise: ProductionExercise;
  disabled: boolean;
  onSubmit: (value: string) => void;
};

export function ProduceInput({ exercise, disabled, onSubmit }: ProduceInputProps) {
  return (
    <>
      <p className="mt-2 text-lg font-bold leading-snug text-foreground">{exercise.prompt}</p>
      <TypedAnswer
        disabled={disabled}
        multiline
        combinationSubmit
        placeholder="Write a full Japanese sentence…"
        helper="Ctrl+Enter checks. Any natural sentence counts."
        submitLabel="Check sentence"
        onSubmit={onSubmit}
      />
    </>
  );
}
