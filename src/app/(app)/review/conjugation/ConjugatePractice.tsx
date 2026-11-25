"use client";

import Link from "next/link";
import { DrillSkeleton } from "../components/DrillSkeleton";
import { SittingBar } from "../components/SittingBar";
import { useHintShortcut } from "../hooks/useHintShortcut";
import { useSavedWords } from "../hooks/useSavedWords";
import { AnswerPanel } from "./AnswerPanel";
import { ConjugateFeedback } from "./ConjugateFeedback";
import { PatternMasteryPanel } from "./PatternMasteryPanel";
import { PromptCard } from "./PromptCard";
import { WordCard } from "./WordCard";
import { useConjugateDrill } from "./useConjugateDrill";

export default function ConjugatePractice() {
  const drill = useConjugateDrill();
  const { savedWords, markSaved } = useSavedWords();
  useHintShortcut(
    drill.requestHint,
    !drill.answered && drill.hints.length > drill.hintLevel
  );
  const {
    target,
    conjugation,
    loading,
    pool,
    targets,
    studyMode,
    error,
    answered,
    patternCorrect,
    nextRound,
    nextSimilar,
    loadWords,
    sitting,
    resetSitting,
    practicedPatterns,
  } = drill;

  if (loading) {
    return <DrillSkeleton />;
  }

  const wordCount = targets?.length ?? 0;

  if (pool.length === 0) {
    return (
      <div className="space-y-3 rounded-3xl border-2 border-dashed border-border p-8 text-center">
        <p className="text-sm font-bold text-foreground">
          {wordCount === 0
            ? studyMode === "due"
              ? "No due words to play with right now."
              : "No words found in your deck."
            : "None of these words have conjugations."}
        </p>
        <p className="text-xs text-muted">
          {wordCount === 0 && studyMode === "due"
            ? "You're all caught up on due reviews! You can play ahead with any learned word."
            : "Nouns don't conjugate — try Construction, or add a verb or adjective."}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {wordCount === 0 && studyMode === "due" && (
            <button
              onClick={() => void loadWords("all")}
              className="rounded-2xl bg-mint px-4 py-2 text-sm font-bold text-white hover:bg-mint/90"
            >
              Practice with all words
            </button>
          )}
          <Link
            href="/review/construction"
            className="rounded-2xl bg-indigo-ai px-4 py-2 text-sm font-bold text-white hover:bg-indigo-ai/90"
          >
            Switch to Construction
          </Link>
        </div>
      </div>
    );
  }

  if (!target || !conjugation) {
    return error ? (
      <p role="alert" className="text-sm font-bold text-rose-500">
        {error}
      </p>
    ) : null;
  }

  return (
    <div className="space-y-4">
      <SittingBar
        answered={sitting.total}
        right={sitting.right}
        streak={sitting.streak}
        tone="mint"
        onReset={resetSitting}
        action={
          <button
            type="button"
            onClick={nextRound}
            className="rounded-xl border-2 border-border px-3 py-1.5 text-xs font-bold text-muted transition hover:text-foreground"
          >
            Skip →
          </button>
        }
      />

      <WordCard drill={drill} savedWords={savedWords} onSaved={markSaved} />
      <PromptCard drill={drill} savedWords={savedWords} onSaved={markSaved} />
      <AnswerPanel drill={drill} />

      {answered && (
        <ConjugateFeedback drill={drill} savedWords={savedWords} onSaved={markSaved} />
      )}

      {answered && (
        <div className="sticky bottom-20 z-20 flex flex-wrap items-center gap-2 rounded-2xl border-2 border-border bg-card/95 p-2 backdrop-blur">
          <button
            onClick={nextRound}
            className="rounded-2xl bg-mint px-5 py-2.5 text-sm font-extrabold text-white hover:bg-mint/90"
          >
            Next sentence →
          </button>
          {!patternCorrect && (
            <button
              onClick={nextSimilar}
              className="rounded-2xl border-2 border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground hover:bg-surface"
            >
              Try a similar one
            </button>
          )}
        </div>
      )}

      <PatternMasteryPanel patterns={practicedPatterns} />

      {error && (
        <p role="alert" className="text-sm font-bold text-rose-500">
          {error}
        </p>
      )}
    </div>
  );
}
