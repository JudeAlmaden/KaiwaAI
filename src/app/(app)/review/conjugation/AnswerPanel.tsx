"use client";

import type { ConjugateDrill } from "./useConjugateDrill";

type AnswerPanelProps = {
  drill: ConjugateDrill;
};

export function AnswerPanel({ drill }: AnswerPanelProps) {
  const {
    conjugation,
    answered,
    hints,
    hintLevel,
    suggestHint,
    requestHint,
    picked,
    draft,
    romaji,
    updateDraft,
    setRomaji,
    typedResult,
    chooseForm,
    checkTyped,
    nextRound,
  } = drill;

  if (!conjugation) return null;

  return (
    <>
      {!answered && hints.length > 0 && (
        <div className="space-y-2">
          {hintLevel > 0 && (
            <div className="space-y-1 rounded-2xl border border-amber/30 bg-amber/5 px-4 py-3 text-xs text-muted">
              <p className="font-bold text-foreground">Hints</p>
              {hints.slice(0, hintLevel).map((hint, i) => (
                <p key={hint}>
                  <span className="font-bold text-amber">{i + 1}.</span> {hint}
                </p>
              ))}
            </div>
          )}
          {hintLevel < hints.length && (
            <button
              type="button"
              onClick={requestHint}
              title="Show a hint (H)"
              className="flex items-center gap-2 rounded-xl border-2 border-border px-3 py-1.5 text-xs font-bold text-muted transition hover:border-amber/40 hover:text-foreground"
            >
              {hintLevel === 0 ? "Hint" : "Another hint"}
              <span className="text-[9px] font-extrabold opacity-60">H</span>
              <span className="text-[10px] opacity-70">
                {hintLevel}/{hints.length}
              </span>
              {suggestHint && hintLevel === 0 && (
                <span className="rounded bg-amber/15 px-1.5 py-0.5 text-[9px] text-amber">
                  suggested
                </span>
              )}
            </button>
          )}
        </div>
      )}

      {conjugation.mode === "choice" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {conjugation.choices.map((choice) => {
            const isAnswer = choice.text === conjugation.answer;
            const isPicked = choice.text === picked;
            const state =
              picked === null ? "idle" : isAnswer ? "correct" : isPicked ? "wrong" : "dim";
            return (
              <button
                key={choice.text}
                onClick={() => chooseForm(choice.text)}
                disabled={picked !== null}
                className={`flex flex-col items-start rounded-2xl border-2 px-4 py-3 text-left transition ${
                  state === "idle"
                    ? "border-border bg-card hover:border-mint/50 hover:bg-mint/5"
                    : state === "correct"
                      ? "border-mint bg-mint/15"
                      : state === "wrong"
                        ? "border-rose-500/50 bg-rose-500/10"
                        : "border-border bg-card opacity-50"
                } ${picked !== null ? "cursor-default" : ""}`}
              >
                <span className="font-jp text-lg font-extrabold text-foreground">
                  {choice.text}
                  {state === "correct" && <span className="ml-2 text-mint">✓</span>}
                  {state === "wrong" && <span className="ml-2 text-rose-500">✕</span>}
                </span>
                {choice.reading !== choice.text && (
                  <span className="text-[11px] text-muted">{choice.reading}</span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-bold text-foreground">
              Type the {conjugation.label.toLowerCase()} form
            </span>
            <input
              value={draft}
              onChange={(event) => updateDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                if (answered) nextRound();
                else checkTyped();
              }}
              placeholder={conjugation.stage === 4 ? "きのう…" : "type the form"}
              disabled={typedResult !== null}
              className="w-full rounded-2xl border-2 border-border bg-card px-4 py-3 font-jp text-lg text-foreground outline-none focus:border-mint disabled:opacity-60"
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
            <span>Kana or kanji both count. Enter checks.</span>
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
          {typedResult === null && (
            <button
              onClick={checkTyped}
              disabled={!draft.trim()}
              className="rounded-2xl bg-mint px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-40"
            >
              Check
            </button>
          )}
        </div>
      )}
    </>
  );
}
