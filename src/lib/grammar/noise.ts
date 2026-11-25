/**
 * Decoy tiles for assembly exercises.
 *
 * Authored tiles hold the sentence plus one curated distractor, already in
 * sentence order, which turns "build the sentence" into "skip one tile". This
 * module adds a few derived decoys (sibling particles, a wrong tense or
 * polarity ending) and returns the tray shuffled, so word order and particle
 * choice both have to be decided.
 *
 * Everything is derived from the exercise and seeded by its id, so the same
 * item always looks the same and nothing changes on re-render.
 */

import type { AssemblyExercise } from "./types";

/** Extra decoys aimed for; longer sentences can carry one more. */
export const BASE_DECOYS = 3;
export const HARD_DECOYS = 4;

const PARTICLE_POOL = ["を", "は", "が", "に", "で", "へ", "の", "も"];

/**
 * Wrong endings for a predicate tile: same verb, different tense or polarity.
 * These are exactly the decisions the English prompt settles.
 */
function endingVariants(token: string): string[] {
  if (token.endsWith("ます")) {
    const stem = token.slice(0, -"ます".length);
    return [`${stem}ました`, `${stem}ません`];
  }
  if (token.endsWith("です")) return ["でした", "じゃないです"];
  return [];
}

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result = Math.imul(result ^ value.charCodeAt(index), 16777619);
  }
  return result >>> 0;
}

function shuffle<T>(items: T[], seed: number): T[] {
  const next = [...items];
  let state = seed || 1;
  for (let index = next.length - 1; index > 0; index -= 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const pick = (state >>> 0) % (index + 1);
    [next[index], next[pick]] = [next[pick]!, next[index]!];
  }
  return next;
}

/** Decoys to add on top of the authored ones, alternating particles and endings. */
export function extraDecoys(exercise: AssemblyExercise): string[] {
  const used = new Set(exercise.tiles);
  const target = exercise.stage >= 3 ? HARD_DECOYS : BASE_DECOYS;
  const authored = exercise.tiles.filter(
    (tile) => !exercise.solution.includes(tile)
  ).length;
  const wanted = Math.max(0, target - authored);
  if (wanted === 0) return [];

  const particles = PARTICLE_POOL.filter(
    (particle) => !exercise.solution.includes(particle) && !used.has(particle)
  );
  const endings = [
    ...new Set(exercise.solution.flatMap(endingVariants)),
  ].filter((ending) => !used.has(ending));

  // Mix the two kinds so the noise is not all particles or all verb forms.
  const interleaved: string[] = [];
  for (let index = 0; index < Math.max(particles.length, endings.length); index += 1) {
    if (particles[index]) interleaved.push(particles[index]!);
    if (endings[index]) interleaved.push(endings[index]!);
  }

  const picked: string[] = [];
  for (const candidate of interleaved) {
    if (picked.length >= wanted) break;
    if (picked.includes(candidate) || exercise.solution.includes(candidate)) continue;
    picked.push(candidate);
  }
  return picked;
}

/**
 * The full tile tray: correct sentence, authored decoys, derived decoys, mixed.
 * Decoys can never merge into a valid sentence because checking compares the
 * whole sequence against `solution`.
 */
export function assembleTiles(exercise: AssemblyExercise): string[] {
  const tiles = [...exercise.tiles, ...extraDecoys(exercise)];
  return shuffle(tiles, hash(exercise.id));
}

/** How many tiles in the tray do not belong in the sentence. */
export function decoyCount(exercise: AssemblyExercise): number {
  return exercise.tiles.length + extraDecoys(exercise).length - exercise.solution.length;
}
