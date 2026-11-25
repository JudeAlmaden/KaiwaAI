"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CARRYOVER_KEY,
  clearCurrent,
  decodeCarryOver,
  encodeCarryOver,
  noteLoaded,
  resolveCarryOver,
  setCurrent,
  type CarryOverState,
} from "@/lib/grammar/carryover";
import { GRAMMAR_EXERCISES } from "@/lib/grammar/exercises";
import { generateExercises } from "@/lib/grammar/generate";
import { applyAttempt, type ConceptStats } from "@/lib/grammar/mastery";
import { nextInStream, rememberConcept, rememberRecent } from "@/lib/grammar/stream";
import { checkExercise } from "@/lib/grammar/validate";
import type { CheckResult, GrammarExercise, GrammarResponse } from "@/lib/grammar/types";
import { readStored, writeStored } from "@/lib/local-store";
import { useSitting } from "../hooks/useSitting";
import { loadGrammarContext } from "./loadGrammarContext";

/** The curated bank is in the bundle: the first exercise needs no network. */
function firstExercise(): GrammarExercise | null {
  return nextInStream({ exercises: GRAMMAR_EXERCISES, stats: {}, seed: 0 });
}

/**
 * The stream has no session: it holds one exercise, the persisted stats used to
 * choose it, and two small in-memory buffers (recent items and concepts). Every
 * "next" is recomputed from the latest mastery.
 *
 * The exercise on screen is also remembered locally (id only), so a reload
 * resumes the question that was unanswered instead of skipping it.
 */
export function useGrammarStream() {
  const [stats, setStats] = useState<Record<string, ConceptStats>>({});
  const [knownWords, setKnownWords] = useState<Set<string>>(() => new Set());
  const [exercise, setExercise] = useState<GrammarExercise | null>(firstExercise);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [hintShown, setHintShown] = useState(false);
  const [misses, setMisses] = useState(0);
  const [focus, setFocus] = useState<string | null>(null);
  const { sitting, record: recordSitting, reset: resetSitting } = useSitting("construction");
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const statsRef = useRef<Record<string, ConceptStats>>({});
  const knownWordsRef = useRef<Set<string>>(new Set());
  // Curated bank plus whatever the saved vocabulary can generate.
  const bankRef = useRef<GrammarExercise[]>(GRAMMAR_EXERCISES);
  const exerciseRef = useRef<GrammarExercise | null>(exercise);
  const carryRef = useRef<CarryOverState | null>(null);
  const recentIdsRef = useRef<string[]>([]);
  const recentConceptsRef = useRef<string[]>([]);
  const lastKindRef = useRef<Record<string, string>>({});
  const recordedRef = useRef(false);
  // Seeding happens on mount (see effect) so rendering stays pure.
  const seedRef = useRef(0);

  const saveCarry = useCallback((next: CarryOverState) => {
    carryRef.current = next;
    writeStored(CARRYOVER_KEY, encodeCarryOver(next));
  }, []);

  /** Puts an exercise on screen, records it in the buffers and in carry-over. */
  const show = useCallback(
    (next: GrammarExercise | null) => {
      exerciseRef.current = next;
      setExercise(next);
      setResult(null);
      setHintShown(false);
      setMisses(0);
      recordedRef.current = false;
      if (!next) return;

      recentIdsRef.current = rememberRecent(recentIdsRef.current, next.id);
      recentConceptsRef.current = rememberConcept(recentConceptsRef.current, next.concept);
      lastKindRef.current = { ...lastKindRef.current, [next.concept]: next.kind };
      if (carryRef.current) saveCarry(setCurrent(carryRef.current, next.id));
    },
    [saveCarry]
  );

  const pick = useCallback(
    (nextFocus: string | null) => {
      const next = nextInStream({
        exercises: bankRef.current,
        stats: statsRef.current,
        knownWords: knownWordsRef.current,
        focusConcept: nextFocus,
        recentIds: recentIdsRef.current,
        recentConcepts: recentConceptsRef.current,
        lastKindByConcept: lastKindRef.current,
        seed: seedRef.current,
      });
      seedRef.current += 1;
      show(next);
    },
    [show]
  );

  useEffect(() => {
    let cancelled = false;
    seedRef.current = Math.floor(Math.random() * 100_000);
    // Read once, before any pick, so a reload restores rather than re-picks.
    carryRef.current = decodeCarryOver(readStored(CARRYOVER_KEY));

    void loadGrammarContext()
      .then((context) => {
        if (cancelled) return;
        statsRef.current = context.stats;
        knownWordsRef.current = context.knownWords;
        bankRef.current = [
          ...GRAMMAR_EXERCISES,
          ...generateExercises(context.deckWords),
        ];
        setStats(context.stats);
        setKnownWords(context.knownWords);
        if (context.masteryFailed) {
          setError("Couldn't load your grammar progress — practising anyway.");
        }

        const carry = carryRef.current ?? decodeCarryOver(null);
        const ids = new Set(bankRef.current.map((item) => item.id));
        const resumeId = resolveCarryOver(carry, ids);
        const resumed = resumeId
          ? bankRef.current.find((item) => item.id === resumeId) ?? null
          : null;

        if (resumed) {
          // Count the restore, then show it: `show` keeps the load count.
          saveCarry(noteLoaded(carry));
          show(resumed);
          return;
        }

        // Keep the exercise already on screen and just remember it, so the new
        // mastery/deck data affects the next pick instead of swapping content.
        const seed = exerciseRef.current;
        if (seed) {
          recentIdsRef.current = rememberRecent(recentIdsRef.current, seed.id);
          recentConceptsRef.current = rememberConcept(recentConceptsRef.current, seed.concept);
          lastKindRef.current = { ...lastKindRef.current, [seed.concept]: seed.kind };
          if (!carry.current) saveCarry(setCurrent(carry, seed.id));
          return;
        }

        pick(null);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Couldn't load your grammar progress.");
        if (!exerciseRef.current) pick(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pick, saveCarry, show]);

  function record(conceptId: string, correct: boolean) {
    const attempt = applyAttempt(statsRef.current[conceptId], correct);
    const updated: Record<string, ConceptStats> = {
      ...statsRef.current,
      [conceptId]: {
        concept: conceptId,
        attempts: attempt.attempts,
        correct: attempt.correct,
        streak: attempt.streak,
        dueAt: attempt.dueAt,
        lastPracticed: new Date(),
      },
    };
    statsRef.current = updated;
    setStats(updated);
    recordSitting(correct);
    void fetch("/api/grammar/mastery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concept: conceptId, correct }),
    }).catch(() => {
      // Local state already reflects the attempt; the next sync catches up.
    });
  }

  function submit(response: GrammarResponse) {
    if (!exercise || result) return;
    const checked = checkExercise(exercise, response);
    setResult(checked);
    if (!checked.correct) setMisses((current) => current + 1);
    if (!recordedRef.current) {
      recordedRef.current = true;
      record(exercise.concept, checked.correct);
    }
    // Answered either way (mastery is written), so it is no longer resumable.
    if (carryRef.current) saveCarry(clearCurrent(carryRef.current));
  }

  function retry() {
    setResult(null);
    // Remounting the input clears the typed/tapped answer without touching
    // mastery: the attempt was already recorded.
    setRetryKey((current) => current + 1);
  }

  function chooseFocus(conceptId: string | null) {
    setFocus(conceptId);
    pick(conceptId);
  }

  return {
    loading,
    error,
    exercise,
    result,
    hintShown,
    misses,
    focus,
    stats,
    knownWords,
    sitting,
    resetSitting,
    retryKey,
    toggleHint: () => setHintShown((current) => !current),
    submit,
    retry,
    next: () => pick(focus),
    chooseFocus,
  };
}

export type GrammarStreamState = ReturnType<typeof useGrammarStream>;
