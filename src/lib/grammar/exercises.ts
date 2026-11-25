import { BASICS_EXERCISES } from "./content-basics";
import { EXPANSION_EXERCISES } from "./content-expansion";
import { VERB_EXERCISES } from "./content-verbs";
import type { GrammarExercise } from "./types";

/**
 * The whole sentence-construction bank. Content is curated (not generated from
 * random vocabulary) so every sentence is natural and every distractor is a
 * mistake a learner actually makes.
 */
export const GRAMMAR_EXERCISES: GrammarExercise[] = [
  ...BASICS_EXERCISES,
  ...VERB_EXERCISES,
  ...EXPANSION_EXERCISES,
];

export const EXERCISE_BY_ID = new Map(GRAMMAR_EXERCISES.map((exercise) => [exercise.id, exercise]));

export function exercisesForConcept(conceptId: string): GrammarExercise[] {
  return GRAMMAR_EXERCISES.filter((exercise) => exercise.concept === conceptId);
}

export function exerciseById(id: string): GrammarExercise | undefined {
  return EXERCISE_BY_ID.get(id);
}
