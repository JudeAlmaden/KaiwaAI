/**
 * Answer checking for Sentence Construction.
 *
 * Every exercise type has one canonical answer plus any number of legitimate
 * alternatives (kanji/kana spellings, natural word orders, paraphrases).
 * Feedback names the specific slip when the wrong answer is a known near-miss.
 */

import { normalizeAnswer } from "@/lib/review/sentence-task";
import type { CheckResult, GrammarExercise, GrammarResponse } from "./types";

const PARTICLES = new Set(["は", "が", "を", "に", "で", "の", "も", "へ"]);
const PREDICATE_END =
  /(ます|ました|ません|ませんでした|です|でした|ください|ください|ない|なかった|くない|くなかった|たい|ほしい|だった|た|だ|る|う|く|す|つ|ぬ|ぶ|む|ぐ|い)$/;

/** Kana/kanji, spacing and punctuation differences never fail an answer. */
export function normalizeJa(value: string): string {
  return normalizeAnswer(value);
}

export function acceptedAnswers(exercise: GrammarExercise): string[] {
  switch (exercise.kind) {
    case "assemble": {
      const orders = [exercise.solution, ...(exercise.alternativeOrders ?? [])];
      return orders.map((order) => order.join(""));
    }
    case "particle":
      return [exercise.answer];
    case "complete":
      return [exercise.answer, ...(exercise.accepted ?? [])];
    case "transform":
      return [exercise.answer, ...(exercise.accepted ?? [])];
    case "produce":
      return [exercise.ja, ...exercise.accepted];
  }
}

export function expectedSentence(exercise: GrammarExercise): string {
  switch (exercise.kind) {
    case "particle":
    case "complete":
      return `${exercise.before}${exercise.answer}${exercise.after}`;
    default:
      return exercise.ja;
  }
}

function nearMissNote(exercise: GrammarExercise, normalized: string): string | null {
  const hit = exercise.nearMisses?.find(
    (miss) => normalizeJa(miss.answer) === normalized
  );
  return hit?.note ?? null;
}

const PREDICATE_FORMS: { suffix: string; form: string; stem?: string }[] = [
  { suffix: "ませんでした", form: "past negative" },
  { suffix: "ました", form: "past tense" },
  { suffix: "ません", form: "negative" },
  { suffix: "ます", form: "non-past" },
  { suffix: "じゃなかったです", form: "past negative", stem: "です" },
  { suffix: "ではなかったです", form: "past negative", stem: "です" },
  { suffix: "じゃないです", form: "negative", stem: "です" },
  { suffix: "ではないです", form: "negative", stem: "です" },
  { suffix: "じゃありません", form: "negative", stem: "です" },
  { suffix: "でした", form: "past tense", stem: "です" },
  { suffix: "です", form: "non-past", stem: "です" },
];

function describePredicateForm(token: string): { stem: string; form: string } | null {
  for (const entry of PREDICATE_FORMS) {
    if (token.endsWith(entry.suffix)) {
      const stem = entry.stem ?? token.slice(0, -entry.suffix.length);
      return { stem, form: entry.form };
    }
  }
  return null;
}

function diffTokens(got: string[], wanted: string[]): { extra: string[]; missing: string[] } {
  const remaining = [...wanted];
  const extra: string[] = [];
  for (const token of got) {
    const normalized = normalizeJa(token);
    const index = remaining.findIndex((item) => normalizeJa(item) === normalized);
    if (index >= 0) {
      remaining.splice(index, 1);
    } else {
      extra.push(token);
    }
  }
  return { extra, missing: remaining };
}

function wrongTileMistake(
  exercise: Extract<GrammarExercise, { kind: "assemble" }>,
  extra: string[],
  missing: string[]
): string {
  for (const got of extra) {
    const gotForm = describePredicateForm(got);
    if (!gotForm) continue;
    for (const wanted of missing) {
      const wantedForm = describePredicateForm(wanted);
      if (wantedForm && gotForm.stem === wantedForm.stem && gotForm.form !== wantedForm.form) {
        const target = exercise.en ? `For "${exercise.en}", use` : "Use";
        return `You used 「${got}」 (${gotForm.form}). ${target} 「${wanted}」 (${wantedForm.form}).`;
      }
    }
  }

  const wrongParticle = extra.find((token) => PARTICLES.has(token));
  const wantedParticle = missing.find((token) => PARTICLES.has(token));
  if (wrongParticle && wantedParticle) {
    return `You used 「${wrongParticle}」 instead of 「${wantedParticle}」.`;
  }

  if (extra.length === 1 && missing.length === 1) {
    return `「${extra[0]}」 doesn't belong in this sentence — use 「${missing[0]}」 instead.`;
  }

  const list = extra.map((token) => `「${token}」`).join(", ");
  return `${list} ${extra.length === 1 ? "doesn't" : "don't"} belong in this sentence.`;
}

function isPredicate(token: string): boolean {
  return PREDICATE_END.test(token);
}

function firstMismatch(got: string[], wanted: string[]): number {
  const length = Math.min(got.length, wanted.length);
  for (let i = 0; i < length; i += 1) {
    if (got[i] !== wanted[i]) return i;
  }
  return length;
}

function checkAssembly(
  exercise: Extract<GrammarExercise, { kind: "assemble" }>,
  response: string[]
): CheckResult {
  const expected = exercise.ja;
  const tokens = response.map((token) => token.trim()).filter(Boolean);
  if (tokens.length === 0) {
    return { correct: false, expected, mistake: "Place a few word tiles first." };
  }

  const joined = normalizeJa(tokens.join(""));
  const orders = [exercise.solution, ...(exercise.alternativeOrders ?? [])];
  if (orders.some((order) => normalizeJa(order.join("")) === joined)) {
    return { correct: true, expected, mistake: null };
  }

  const nearMiss = nearMissNote(exercise, joined);
  if (nearMiss) {
    return { correct: false, expected, mistake: nearMiss };
  }

  const canonical = exercise.solution;
  if (tokens.includes("です") && !canonical.includes("です")) {
    return {
      correct: false,
      expected,
      mistake: "です doesn't belong here — the verb at the end already finishes the sentence.",
    };
  }

  if (tokens.length !== canonical.length) {
    return {
      correct: false,
      expected,
      mistake:
        tokens.length < canonical.length
          ? "Some words are still in the tray — the sentence needs all of them."
          : "One tile doesn't belong in this sentence.",
    };
  }

  const { extra, missing } = diffTokens(tokens, canonical);
  if (extra.length > 0) {
    return {
      correct: false,
      expected,
      mistake: wrongTileMistake(exercise, extra, missing),
    };
  }

  const at = firstMismatch(tokens, canonical);
  const wanted = canonical[at];
  const got = tokens[at];
  if (wanted && got) {
    if (isPredicate(wanted) && !isPredicate(got)) {
      return {
        correct: false,
        expected,
        mistake: `「${wanted}」 finishes the sentence, so it belongs at the end.`,
      };
    }
    if (isPredicate(got) && !isPredicate(wanted)) {
      return {
        correct: false,
        expected,
        mistake: `「${got}」 is the predicate — in Japanese it belongs at the end.`,
      };
    }
    if (PARTICLES.has(got) && !PARTICLES.has(wanted)) {
      return {
        correct: false,
        expected,
        mistake: `「${got}」 marks the wrong word — each particle follows the noun it belongs to.`,
      };
    }
    if (PARTICLES.has(wanted)) {
      return {
        correct: false,
        expected,
        mistake: `「${wanted}」 comes right after the word it marks.`,
      };
    }
  }

  return {
    correct: false,
    expected,
    mistake: "The words are there, but Japanese order is topic → object → verb.",
  };
}

export function checkExercise(
  exercise: GrammarExercise,
  response: GrammarResponse
): CheckResult {
  const expected = expectedSentence(exercise);

  if (exercise.kind === "assemble") {
    return checkAssembly(exercise, Array.isArray(response) ? response : [response]);
  }

  const raw = Array.isArray(response) ? response.join("") : response;
  const value = raw.trim();
  const normalized = normalizeJa(value);

  if (!normalized) {
    return {
      correct: false,
      expected,
      mistake:
        exercise.kind === "particle"
          ? "Choose the particle that fits the blank."
          : "Type or choose the missing part first.",
    };
  }

  const accepted = acceptedAnswers(exercise).some(
    (answer) => normalizeJa(answer) === normalized
  );
  if (accepted) return { correct: true, expected, mistake: null };

  if (exercise.kind === "particle") {
    return {
      correct: false,
      expected,
      mistake:
        exercise.whyWrong?.[value] ??
        `「${value}」 doesn't mark the role this sentence needs. ${exercise.rule}`,
    };
  }

  if (exercise.kind === "transform") {
    if (normalizeJa(raw) === normalizeJa(exercise.from)) {
      return {
        correct: false,
        expected,
        mistake: "That's still the original sentence — apply the change before checking.",
      };
    }
  }

  return {
    correct: false,
    expected,
    mistake:
      nearMissNote(exercise, normalized) ??
      `Not the right form yet. ${exercise.rule}`,
  };
}
