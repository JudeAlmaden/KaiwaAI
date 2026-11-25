"use client";

import { useState, type KeyboardEvent } from "react";
import { toHiragana } from "@/lib/japanese-input";

type TypedAnswerProps = {
  disabled: boolean;
  placeholder: string;
  helper: string;
  submitLabel: string;
  multiline?: boolean;
  /** Ctrl/Cmd+Enter for long answers, plain Enter for short ones. */
  combinationSubmit?: boolean;
  onSubmit: (value: string) => void;
};

/** Shared text field for transform and produce exercises. */
export function TypedAnswer({
  disabled,
  placeholder,
  helper,
  submitLabel,
  multiline = false,
  combinationSubmit = false,
  onSubmit,
}: TypedAnswerProps) {
  const [value, setValue] = useState("");
  const [romaji, setRomaji] = useState(true);

  function change(text: string) {
    setValue(romaji ? toHiragana(text) : text);
  }

  function check() {
    if (disabled) return;
    const text = romaji ? toHiragana(value, { final: true }) : value;
    if (text !== value) setValue(text);
    if (!text.trim()) return;
    onSubmit(text);
  }

  function handleKey(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const submitKey = combinationSubmit
      ? (event.metaKey || event.ctrlKey) && event.key === "Enter"
      : event.key === "Enter";
    if (!submitKey) return;
    event.preventDefault();
    check();
  }

  const fieldClass =
    "w-full rounded-2xl border-2 border-border bg-card px-4 font-jp text-lg text-foreground outline-none focus:border-sky disabled:opacity-60";

  return (
    <div className="mt-3 space-y-2">
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => change(event.target.value)}
          onKeyDown={handleKey}
          disabled={disabled}
          rows={2}
          placeholder={placeholder}
          className={`${fieldClass} resize-none py-3`}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => change(event.target.value)}
          onKeyDown={handleKey}
          disabled={disabled}
          placeholder={placeholder}
          className={`${fieldClass} py-2.5`}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
        <span>{helper}</span>
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
          disabled={!value.trim()}
          className="rounded-2xl bg-sky px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-40"
        >
          {submitLabel}
        </button>
      )}
    </div>
  );
}
