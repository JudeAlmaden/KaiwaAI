/**
 * Generated exercises from the learner's deck.
 *
 * The curated bank is fixed; this turns saved vocabulary into extra practice so
 * the sentence stream grows with the deck. Everything is deterministic (same
 * words in, same exercises out), there is no AI call, and generated items use
 * the existing concept ids so mastery keeps working unchanged.
 */

import { CONCEPT_BY_ID } from "./curriculum";
import { draftsFor, type ExerciseDraft } from "./generated-templates";
import type { DeckWord } from "./deck";
import type { GrammarExercise } from "./types";

/** Enough variety for a sitting without turning the bank into a monolith. */
export const MAX_GENERATED = 160;
/** Drills per saved word, so one word cannot flood the stream. */
export const PER_WORD_LIMIT = 4;

function idFor(word: DeckWord, draft: ExerciseDraft): string {
  return `gen:${word.word}:${draft.kind}:${draft.concept}`;
}

/**
 * Builds exercises for every usable deck word. Words the learner saved twice,
 * templates that would produce the same sentence, and unknown concepts are
 * skipped, so the result is safe to merge straight into the curated bank.
 */
export function generateExercises(
  deckWords: DeckWord[],
  limit: number = MAX_GENERATED
): GrammarExercise[] {
  const nouns = deckWords.filter((word) => word.kind === "noun");
  const seen = new Set<string>();
  const generated: GrammarExercise[] = [];

  for (const word of deckWords) {
    let added = 0;
    for (const draft of draftsFor(word, nouns)) {
      if (added >= PER_WORD_LIMIT) break;
      if (!CONCEPT_BY_ID.has(draft.concept)) continue;

      const key = `${draft.concept}:${draft.ja}`;
      if (seen.has(key)) continue;
      seen.add(key);

      generated.push({ ...draft, id: idFor(word, draft), generated: true });
      added += 1;
      if (generated.length >= limit) return generated;
    }
  }

  return generated;
}
