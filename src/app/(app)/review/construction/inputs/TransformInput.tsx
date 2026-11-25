"use client";

import type { TransformationExercise } from "@/lib/grammar/types";
import TappableJapanese from "../../components/TappableJapanese";
import { TypedAnswer } from "./TypedAnswer";

type TransformInputProps = {
  exercise: TransformationExercise;
  disabled: boolean;
  savedWords: Set<string>;
  onSaved: (word: string) => void;
  onSubmit: (value: string) => void;
};

export function TransformInput({
  exercise,
  disabled,
  savedWords,
  onSaved,
  onSubmit,
}: TransformInputProps) {
  return (
    <>
      <p className="mt-2 text-sm font-bold text-muted">{exercise.fromEn}</p>
      <p className="mt-1 text-xl font-extrabold text-foreground">
        <TappableJapanese
          text={exercise.from}
          savedWords={savedWords}
          onSaved={onSaved}
          messageContent={exercise.from}
        />
      </p>
      <p className="mt-2 text-sm font-bold text-foreground">
        Change it to: <span className="text-sky">{exercise.target}</span>
      </p>
      <TypedAnswer
        disabled={disabled}
        placeholder="write the new Japanese"
        helper="Kana or kanji both count. Enter checks."
        submitLabel="Check"
        onSubmit={onSubmit}
      />
    </>
  );
}
