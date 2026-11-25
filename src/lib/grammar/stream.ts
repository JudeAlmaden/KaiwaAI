/**
 * The endless exercise stream.
 *
 * There is no round and no unlock ladder: every pick is computed from the whole
 * bank using current mastery. The only state is a short in-memory buffer of
 * recently served items, so the stream keeps moving without repeating itself.
 */

import { difficultyFit, practiceWeight, type ConceptStats } from "./mastery";
import type { GrammarExercise } from "./types";

/** How many exercise ids the stream remembers before repeating. */
export const RECENT_LIMIT = 30;
/** How many concepts the stream avoids revisiting back to back. */
export const RECENT_CONCEPT_LIMIT = 5;

export function rememberRecent(
  recent: string[],
  exerciseId: string,
  limit: number = RECENT_LIMIT
): string[] {
  return moveToEnd(recent, exerciseId, limit);
}

/** Same ring-buffer behaviour for concept ids, so topics rotate as well. */
export function rememberConcept(
  recent: string[],
  conceptId: string,
  limit: number = RECENT_CONCEPT_LIMIT
): string[] {
  return moveToEnd(recent, conceptId, limit);
}

function moveToEnd(recent: string[], value: string, limit: number): string[] {
  const next = [...recent.filter((item) => item !== value), value];
  return next.length > limit ? next.slice(next.length - limit) : next;
}

export type StreamOptions = {
  exercises: GrammarExercise[];
  stats: Record<string, ConceptStats>;
  knownWords?: Iterable<string>;
  focusConcept?: string | null;
  recentIds?: Iterable<string>;
  recentConcepts?: string[];
  /** Kind last served for a concept, so one format does not dominate. */
  lastKindByConcept?: Record<string, string>;
  seed?: number;
  now?: Date;
};

function hashUnit(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000;
}

function conceptRecencyPenalty(conceptId: string, recent: string[]): number {
  const at = recent.lastIndexOf(conceptId);
  if (at < 0) return 0;
  // The concept just served is the strongest deterrent; older ones fade.
  const distance = recent.length - at;
  return 0.4 / distance;
}

/**
 * Pick the next exercise: weakest concept first, difficulty close to current
 * mastery, a kind the concept hasn't just used, familiar deck words, and no
 * item from the recent buffer unless the whole bank has been seen.
 */
export function nextInStream(options: StreamOptions): GrammarExercise | null {
  const { exercises, stats } = options;
  const now = options.now ?? new Date();
  const seed = options.seed ?? 0;
  const focus = options.focusConcept ?? null;
  const known = new Set(options.knownWords ?? []);
  const recent = new Set(options.recentIds ?? []);
  const recentConcepts = options.recentConcepts ?? [];

  const scoped = exercises.filter((exercise) => !focus || exercise.concept === focus);
  if (scoped.length === 0) return null;

  const fresh = scoped.filter((exercise) => !recent.has(exercise.id));
  const pool = fresh.length > 0 ? fresh : scoped;

  const score = (exercise: GrammarExercise) => {
    const conceptStats = stats[exercise.concept];
    const familiarWord = (exercise.words ?? []).some((word) => known.has(word));
    return (
      practiceWeight(conceptStats, now) +
      difficultyFit(exercise.stage, conceptStats) +
      conceptRecencyPenalty(exercise.concept, recentConcepts) +
      (options.lastKindByConcept?.[exercise.concept] === exercise.kind ? 0.15 : 0) +
      (familiarWord ? -0.35 : 0) +
      (recent.has(exercise.id) ? 1.5 : 0) +
      hashUnit(`${seed}:${exercise.id}`) * 0.15
    );
  };

  return (
    [...pool].sort(
      (a, b) => score(a) - score(b) || a.id.localeCompare(b.id)
    )[0] ?? null
  );
}
