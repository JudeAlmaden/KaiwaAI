"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toHiragana } from "@/lib/japanese-input";
import {
  buildConjugationRound,
  isConjugationCorrect,
  normalizeAnswer,
  pickSentenceTargets,
  supportsTranslationSentence,
  type SentenceTarget,
} from "@/lib/review/sentence-task";
import {
  applyAttempt,
  dimensionAccuracy,
  dimensionForStage,
  feedbackDepth,
  practiceWeight,
  withDimensionAttempt,
  type PatternStats,
  type PracticeStage,
} from "@/lib/review/conjugation-mastery";
import { formsForTarget, groupFor } from "@/lib/review/conjugation";
import {
  POOL_KEY,
  ROUND_KEY,
  decodePool,
  decodeRound,
  encodePool,
  encodeRound,
} from "@/lib/review/practice-cache";
import { readStored, removeStored, writeStored } from "@/lib/local-store";
import { useSitting } from "../hooks/useSitting";

type ReviewCard = {
  id: string;
  word?: string;
  reading?: string;
  meaning?: string;
  partOfSpeech?: string;
  verbType?: string | null;
  adjectiveType?: string | null;
  forms?: Array<{ form: string; reading?: string | null; formType: string }>;
};

type MasteryRow = {
  pattern: string;
  attempts: number;
  correct: number;
  streak: number;
  dueAt: string;
  recognitionAttempts?: number;
  recognitionCorrect?: number;
  constructionAttempts?: number;
  constructionCorrect?: number;
  applicationAttempts?: number;
  applicationCorrect?: number;
};

async function fetchReviewCards(mode: "due" | "all", limit: number): Promise<ReviewCard[]> {
  const res = await fetch(`/api/flashcards/review?studyMode=${mode}&limit=${limit}`);
  if (!res.ok) throw new Error("load failed");
  const data = await res.json();
  return ((data.cards ?? []) as ReviewCard[]).sort(() => Math.random() - 0.5);
}

/**
 * Everything the Fill the blank drill needs: the word queue, per-pattern
 * mastery, the current round and answer state. Presentation lives in the
 * components next to this hook.
 */
export function useConjugateDrill() {
  const [targets, setTargets] = useState<SentenceTarget[] | null>(null);
  const [studyMode, setStudyMode] = useState<"due" | "all">("due");
  const [index, setIndex] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [draft, setDraft] = useState("");
  const [romaji, setRomaji] = useState(true);
  const [picked, setPicked] = useState<string | null>(null);
  const [typedResult, setTypedResult] = useState<boolean | null>(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [mastery, setMastery] = useState<Record<string, PatternStats>>({});
  const [masterySnapshot, setMasterySnapshot] = useState<Record<string, PatternStats>>({});
  // Stage is read from here, not from live mastery, so an answer can't change
  // the question format while its feedback is still on screen.
  const [progressView, setProgressView] = useState<Record<string, PatternStats>>({});
  const [error, setError] = useState<string | null>(null);
  const { sitting, record: recordSitting, reset: resetSitting } = useSitting("conjugation");
  const loadingMore = useRef(false);
  const prefetchedAt = useRef(0);
  const wordsRequested = useRef(false);

  const resetAnswer = useCallback(() => {
    setDraft("");
    setPicked(null);
    setTypedResult(null);
    setHintLevel(0);
    setError(null);
  }, []);

  const loadWords = useCallback(
    async (next: "due" | "all" = "due") => {
      setTargets(null);
      setStudyMode(next);
      setIndex(0);
      setCycle(0);
      prefetchedAt.current = 0;
      resetAnswer();
      try {
        const cards = await fetchReviewCards(next, 60);
        let chosen = pickSentenceTargets(cards, 40);
        // A thin due queue (often a single card) would otherwise repeat the
        // same sentence on every pass. Top it up from the rest of the deck;
        // this is practice-only and makes no SRS writes.
        if (next === "due" && chosen.length < 8) {
          const ahead = await fetchReviewCards("all", 120);
          chosen = pickSentenceTargets([...cards, ...ahead], 60);
        }
        setTargets(chosen);
        // Warm the next visit: the review endpoint is the slow part.
        writeStored(POOL_KEY, encodePool(chosen, next));
      } catch {
        setTargets([]);
        setError("Couldn't load your words.");
      }
    },
    [resetAnswer]
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/conjugation/mastery");
        if (!res.ok) return;
        const data = await res.json();
        const rows = (data.mastery ?? []) as MasteryRow[];
        const map: Record<string, PatternStats> = {};
        for (const row of rows) {
          map[row.pattern] = {
            pattern: row.pattern,
            attempts: row.attempts,
            correct: row.correct,
            streak: row.streak,
            dueAt: row.dueAt,
            recognitionAttempts: row.recognitionAttempts ?? 0,
            recognitionCorrect: row.recognitionCorrect ?? 0,
            constructionAttempts: row.constructionAttempts ?? 0,
            constructionCorrect: row.constructionCorrect ?? 0,
            applicationAttempts: row.applicationAttempts ?? 0,
            applicationCorrect: row.applicationCorrect ?? 0,
          };
        }
        if (cancelled) return;
        setMastery(map);
        setProgressView(map);
        // Ordering is frozen per word batch so the queue doesn't reshuffle
        // under the learner's cursor after every answer.
        setMasterySnapshot(map);
      } catch {
        // Practice still works without stored mastery.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (wordsRequested.current) return;
    wordsRequested.current = true;
    // A pool from the last half hour is good enough for practice and skips the
    // slow review round trip entirely.
    const cached = decodePool<SentenceTarget>(readStored(POOL_KEY), "due");
    if (cached) {
      // Deferred so reading storage does not cascade a render inside the effect.
      queueMicrotask(() => setTargets(cached));
      return;
    }
    // Deferred for the same reason: loadWords sets its loading state first.
    queueMicrotask(() => {
      void loadWords("due");
    });
  }, [loadWords]);

  /** Append the next batch in the background so running out of words never stalls. */
  const loadMore = useCallback(async () => {
    if (loadingMore.current) return;
    loadingMore.current = true;
    try {
      const cards = await fetchReviewCards(studyMode, 80);
      const source =
        studyMode === "due" ? [...cards, ...(await fetchReviewCards("all", 120))] : cards;
      const fresh = pickSentenceTargets(source, 60);
      setTargets((current) => {
        if (!current) return current;
        const seen = new Set(current.map((item) => item.word));
        const added = fresh.filter((item) => !seen.has(item.word));
        return added.length ? [...current, ...added] : current;
      });
    } catch {
      // Keep playing the rounds already loaded.
    } finally {
      loadingMore.current = false;
    }
  }, [studyMode]);

  // Words that fit a full sentence (not bare phrases) and have conjugations.
  const sentencePool = useMemo(
    () =>
      (targets ?? []).filter(
        (target) =>
          target.meaning && target.meaning !== "Unknown" && supportsTranslationSentence(target)
      ),
    [targets]
  );

  const pool = useMemo(
    () => sentencePool.filter((target) => buildConjugationRound(target, 0) !== null),
    [sentencePool]
  );

  // Conjugation rounds are ordered once per batch: the weakest patterns first.
  const ordered = useMemo(() => {
    const entries = pool.map((item, position) => {
      const probe = buildConjugationRound(item, position);
      return { item, position, formType: probe?.formType ?? null };
    });
    entries.sort(
      (a, b) =>
        practiceWeight(a.formType ? masterySnapshot[a.formType] : null) -
        practiceWeight(b.formType ? masterySnapshot[b.formType] : null)
    );
    return entries;
  }, [pool, masterySnapshot]);

  const rounds = useMemo(
    () =>
      ordered.map(({ item, position }) => {
        // A small pool cycles through different conjugations on each pass
        // instead of asking the identical sentence again.
        const offset = pool.length > 0 && pool.length < 8 ? cycle * pool.length : 0;
        const seed = position + offset;
        const probe = buildConjugationRound(item, seed);
        return {
          target: item,
          conjugation: probe
            ? buildConjugationRound(item, seed, progressView[probe.formType] ?? null)
            : null,
        };
      }),
    [ordered, progressView, cycle, pool.length]
  );

  const round = rounds[index] ?? null;
  const target = round?.target ?? null;
  const conjugation = round?.conjugation ?? null;
  const answered = picked !== null || typedResult !== null;
  const patternCorrect = picked === conjugation?.answer || typedResult === true;

  // Resume the round that was on screen when the learner left. The pointer is
  // read before it is overwritten by the save effect below.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || pool.length === 0) return;
    restored.current = true;
    const pointer = decodeRound(readStored(ROUND_KEY));
    if (!pointer) return;
    const at = rounds.findIndex(
      (item) =>
        item.target?.word === pointer.word &&
        item.conjugation?.formType === pointer.formType
    );
    if (at > 0) queueMicrotask(() => setIndex(at));
  }, [pool.length, rounds]);

  useEffect(() => {
    if (!target || !conjugation) return;
    if (answered) {
      // Answered rounds are not resumable: mastery already recorded them.
      removeStored(ROUND_KEY);
      return;
    }
    writeStored(
      ROUND_KEY,
      encodeRound({ word: target.word, formType: conjugation.formType })
    );
  }, [target, conjugation, answered]);

  /** Score plus per-pattern mastery, persisted through the app's API. */
  function recordPattern(pattern: string, correct: boolean, stage: PracticeStage) {
    recordSitting(correct);
    const dimension = dimensionForStage(stage);
    setMastery((current) => {
      const prev = current[pattern];
      const next = applyAttempt(prev, correct);
      return {
        ...current,
        [pattern]: {
          ...prev,
          pattern,
          attempts: next.attempts,
          correct: next.correct,
          streak: next.streak,
          dueAt: next.dueAt,
          ...withDimensionAttempt(prev, dimension, correct),
        },
      };
    });
    void fetch("/api/conjugation/mastery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pattern, correct, stage }),
    }).catch(() => {
      // Local state already reflects the attempt; the next sync will catch up.
    });
  }

  function nextRound() {
    resetAnswer();
    // Stage changes take effect on the next question, never mid-feedback.
    setProgressView(mastery);
    if (index >= pool.length - 5 && prefetchedAt.current !== targets?.length) {
      prefetchedAt.current = targets?.length ?? 0;
      void loadMore();
    }
    if (index + 1 >= pool.length) {
      setCycle((current) => current + 1);
      setIndex(0);
    } else {
      setIndex(index + 1);
    }
  }

  function chooseForm(choice: string) {
    if (!conjugation || picked !== null || typedResult !== null) return;
    setPicked(choice);
    recordPattern(conjugation.formType, choice === conjugation.answer, conjugation.stage);
  }

  /** After a miss, offer the same pattern with a different word. */
  function nextSimilar() {
    if (!conjugation) return;
    resetAnswer();
    setProgressView(mastery);
    const ahead = rounds.findIndex(
      (item, i) => i > index && item.conjugation?.formType === conjugation.formType
    );
    const wrapped = rounds.findIndex((item) => item.conjugation?.formType === conjugation.formType);
    const next = ahead >= 0 ? ahead : wrapped;
    // With a one-word queue the only "similar" round is the current one, so
    // advance normally (which rotates to a different conjugation).
    if (next >= 0 && next !== index) setIndex(next);
    else nextRound();
  }

  function checkTyped() {
    if (!conjugation || typedResult !== null) return;
    const text = romaji ? toHiragana(draft, { final: true }) : draft;
    if (text !== draft) setDraft(text);
    if (!text.trim()) return;
    const correct = isConjugationCorrect(text, conjugation);
    setTypedResult(correct);
    recordPattern(conjugation.formType, correct, conjugation.stage);
  }

  // Name the learner's actual slip, whether they picked it or typed it.
  const mistake = useMemo(() => {
    if (!conjugation || patternCorrect) return null;
    if (picked) {
      return conjugation.explanation.others.find((other) => other.form === picked)?.why ?? null;
    }
    if (typedResult === false) {
      const typed = normalizeAnswer(draft);
      const other = conjugation.choices.find(
        (choice) =>
          choice.formType !== conjugation.formType && normalizeAnswer(choice.text) === typed
      );
      return other
        ? (conjugation.explanation.others.find((item) => item.form === other.text)?.why ?? null)
        : null;
    }
    return null;
  }, [conjugation, patternCorrect, picked, typedResult, draft]);

  const otherExplanations = useMemo(
    () => (conjugation?.explanation.others ?? []).filter((other) => other.form !== picked),
    [conjugation, picked]
  );

  // Stage 3 hides the sentence, so its sentence-specific context hint would
  // refer to words the learner cannot see.
  const hints = useMemo(
    () =>
      conjugation ? (conjugation.stage === 3 ? conjugation.hints.slice(1) : conjugation.hints) : [],
    [conjugation]
  );
  const hintsUsed = hintLevel > 0;
  const activeDimension = conjugation ? dimensionForStage(conjugation.stage) : null;
  const activeStats = conjugation ? mastery[conjugation.formType] : null;
  const activeAccuracy = activeDimension
    ? dimensionAccuracy(activeStats, activeDimension)
    : null;
  const suggestHint = activeAccuracy !== null && activeAccuracy < 0.6;
  const verbosity =
    conjugation && answered
      ? feedbackDepth({
          correct: patternCorrect,
          hintsUsed: hintLevel,
          stats: activeStats,
          stage: conjugation.stage,
        })
      : "standard";

  const wordGroup = useMemo(() => (target ? groupFor(target) : null), [target]);
  const wordForms = useMemo(() => (target ? formsForTarget(target) : []), [target]);
  // A reference example that does not give away the form currently being asked.
  const cardExample = useMemo(() => {
    if (!target || !conjugation) return null;
    for (let offset = 1; offset <= 9; offset += 1) {
      const example = buildConjugationRound(target, offset);
      if (example && example.formType !== conjugation.formType) return example;
    }
    return null;
  }, [target, conjugation]);

  const practicedPatterns = useMemo(
    () =>
      Object.values(mastery)
        .filter((item) => item.attempts > 0)
        .sort((a, b) => a.correct / a.attempts - b.correct / b.attempts)
        .slice(0, 12),
    [mastery]
  );

  return {
    targets,
    studyMode,
    index,
    pool,
    target,
    conjugation,
    answered,
    patternCorrect,
    mistake,
    hints,
    hintLevel,
    suggestHint,
    verbosity,
    otherExplanations,
    hintsUsed,
    wordGroup,
    wordForms,
    cardExample,
    practicedPatterns,
    error,
    loading: targets === null,
    draft,
    romaji,
    picked,
    typedResult,
    sitting,
    resetSitting,
    resetAnswer,
    loadWords,
    nextRound,
    nextSimilar,
    chooseForm,
    checkTyped,
    requestHint: () => setHintLevel((level) => Math.min(hints.length, level + 1)),
    updateDraft: (value: string) => {
      setDraft(romaji ? toHiragana(value) : value);
      setTypedResult(null);
    },
    setRomaji,
  };
}

export type ConjugateDrill = ReturnType<typeof useConjugateDrill>;
