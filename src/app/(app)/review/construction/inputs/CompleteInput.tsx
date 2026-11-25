"use client";

import { useState } from "react";
import { toHiragana } from "@/lib/japanese-input";
import type { CheckResult, CompletionExercise } from "@/lib/grammar/types";
import TappableJapanese from "../../components/TappableJapanese";

type CompleteInputProps = {
  exercise: CompletionExercise;
  result: CheckResult | null;
  savedWords: Set<string>;
  onSaved: (word: string) => void;
  onSubmit: (value: string) => void;
};

export function CompleteInput({
  exercise,
  result,
  savedWords,
  onSaved,
  onSubmit,
}: CompleteInputProps) {
  const [typed, setTyped] = useState("");
  const [romaji, setRomaji] = useState(true);
  const disabled = result !== null;

  function check() {
    if (disabled) return;
    const text = romaji ? toHiragana(typed, { final: true }) : typed;
    if (text !== typed) setTyped(text);
    if (!text.trim()) return;
    onSubmit(text);
  }

  const blank = typed && result ? typed : "＿＿";

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
        <span className="mx-1 inline-block min-w-10 border-b-2 border-sky text-center text-sky">
          {blank}
        </span>
        <TappableJapanese
          text={exercise.after}
          savedWords={savedWords}
          onSaved={onSaved}
          messageContent={exercise.ja}
        />
      </p>

      {exercise.options ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {exercise.options.map((option) => {
            const isAnswer = option === exercise.answer;
            const picked = typed === option && result !== null;
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
                disabled={disabled}
                onClick={() => {
                  setTyped(option);
                  onSubmit(option);
                }}
                className={`rounded-2xl border-2 px-3 py-2.5 font-jp text-base font-extrabold text-foreground transition ${style}`}
              >
                {option}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-bold text-foreground">Missing part</span>
            <input
              value={typed}
              onChange={(event) =>
                setTyped(romaji ? toHiragana(event.target.value) : event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                check();
              }}
              disabled={disabled}
              placeholder={exercise.hint ?? "type the missing part"}
              className="w-full rounded-2xl border-2 border-border bg-card px-4 py-2.5 font-jp text-lg text-foreground outline-none focus:border-sky disabled:opacity-60"
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
            <span>Kana or kanji both count.</span>
            <label className="flex items-center gap-1.5 font-bold">
              <input
                type="checkbox"
                checked={romaji}
                onChange={(event) => setRomaji(event.target.checked)}
                className="h-3.5 w-3.5"
              />
              Romaji → kana
            </label>
          </div>
          {!disabled && (
            <button
              onClick={check}
              disabled={!typed.trim()}
              className="rounded-2xl bg-sky px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-40"
            >
              Check
            </button>
          )}
        </div>
      )}
    </>
  );
}
