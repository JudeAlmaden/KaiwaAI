/**
 * Optional hints for Sentence Construction.
 *
 * A hint points at the grammar decision without spelling out the answer:
 * authored hints win, otherwise the concept's teaching lines, the sentence
 * shape and the requested form are enough to get unstuck.
 */

import type { GrammarConcept } from "./curriculum";
import type { ConjugationNote, GrammarExercise } from "./types";

function shapeHint(exercise: GrammarExercise): string | null {
  if (!exercise.structure || exercise.structure.length === 0) return null;
  return `Sentence shape: ${exercise.structure.join(" · ")}.`;
}

export function hintFor(exercise: GrammarExercise, concept: GrammarConcept): string {
  if (exercise.hint) return exercise.hint;

  const rule = concept.teaches[0] ?? concept.goal;
  const shape = shapeHint(exercise);

  switch (exercise.kind) {
    case "assemble":
      return [
        shape ?? "Japanese order is topic → object → verb, with extra words left over.",
        `Every noun keeps its own particle — ${concept.goal.toLowerCase()}`,
      ].join(" ");
    case "particle":
      return `Ask what role the word before the blank plays. ${rule}`;
    case "complete":
      return [
        exercise.en ? `It means “${exercise.en}”.` : "",
        `Match the form to the time and politeness. ${rule}`,
      ]
        .filter(Boolean)
        .join(" ");
    case "transform":
      return `Start from 「${exercise.from}」. To make it ${exercise.target.toLowerCase()}: ${rule}`;
    case "produce":
      return [
        shape ?? "Build it topic → object → verb.",
        `Not sure of a word? Paraphrase with vocabulary you know. ${rule}`,
      ].join(" ");
    default:
      return rule;
  }
}

/** Steps for the feedback panel; falls back to the exercise's rule line. */
export function conjugationFor(exercise: GrammarExercise): ConjugationNote | null {
  if (exercise.kind !== "transform") return null;
  if (exercise.conjugation) return exercise.conjugation;
  return { form: exercise.target, steps: [exercise.rule] };
}
