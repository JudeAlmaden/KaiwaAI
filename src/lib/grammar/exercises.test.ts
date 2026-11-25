import { describe, expect, it } from "vitest";
import { CONCEPTS, CONCEPT_BY_ID, MODULES } from "./curriculum";
import { GRAMMAR_EXERCISES } from "./exercises";
import { acceptedAnswers, expectedSentence, normalizeJa } from "./validate";

describe("curriculum", () => {
  it("gives every module a set of concepts", () => {
    for (const moduleItem of MODULES) {
      const concepts = CONCEPTS.filter((concept) => concept.moduleId === moduleItem.id);
      expect(concepts.length, moduleItem.id).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("exercise bank", () => {
  it("uses unique ids", () => {
    const ids = GRAMMAR_EXERCISES.map((exercise) => exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("assigns every exercise to a real concept with a rule", () => {
    for (const exercise of GRAMMAR_EXERCISES) {
      expect(CONCEPT_BY_ID.has(exercise.concept), exercise.id).toBe(true);
      expect(exercise.rule.trim().length, exercise.id).toBeGreaterThan(8);
      expect(exercise.stage).toBeGreaterThanOrEqual(1);
      expect(exercise.stage).toBeLessThanOrEqual(5);
    }
  });

  it("gives every concept a starting exercise and a production task", () => {
    for (const concept of CONCEPTS) {
      const exercises = GRAMMAR_EXERCISES.filter((item) => item.concept === concept.id);
      expect(exercises.length, concept.id).toBeGreaterThanOrEqual(2);
      expect(exercises.some((item) => item.stage === 1), `${concept.id} stage 1`).toBe(true);
      expect(exercises.some((item) => item.stage === 5), `${concept.id} stage 5`).toBe(true);
    }
  });

  it("keeps assembly solutions consistent with the tiles and sentence", () => {
    for (const exercise of GRAMMAR_EXERCISES) {
      if (exercise.kind !== "assemble") continue;
      expect(
        normalizeJa(exercise.solution.join("")),
        `${exercise.id} solution`
      ).toBe(normalizeJa(exercise.ja));
      for (const token of exercise.solution) {
        expect(exercise.tiles, `${exercise.id} tile ${token}`).toContain(token);
      }
    }
  });

  it("keeps particle exercises solvable with a curated reason for each option", () => {
    for (const exercise of GRAMMAR_EXERCISES) {
      if (exercise.kind !== "particle") continue;
      expect(exercise.options, exercise.id).toContain(exercise.answer);
      expect(expectedSentence(exercise), exercise.id).toBe(exercise.ja);
      for (const option of Object.keys(exercise.whyWrong ?? {})) {
        expect(exercise.options, `${exercise.id} why ${option}`).toContain(option);
      }
    }
  });

  it("keeps completion exercises consistent and choices among the options", () => {
    for (const exercise of GRAMMAR_EXERCISES) {
      if (exercise.kind !== "complete") continue;
      expect(
        `${exercise.before}${exercise.answer}${exercise.after}`,
        exercise.id
      ).toBe(exercise.ja);
      if (exercise.options) {
        expect(exercise.options, exercise.id).toContain(exercise.answer);
      }
    }
  });

  it("keeps transformation answers equal to their displayed sentence", () => {
    for (const exercise of GRAMMAR_EXERCISES) {
      if (exercise.kind !== "transform") continue;
      expect(normalizeJa(exercise.answer), exercise.id).toBe(normalizeJa(exercise.ja));
      expect(exercise.from, exercise.id).not.toBe(exercise.answer);
    }
  });

  it("always accepts the canonical production sentence plus an alternative", () => {
    for (const exercise of GRAMMAR_EXERCISES) {
      if (exercise.kind !== "produce") continue;
      const accepted = acceptedAnswers(exercise).map(normalizeJa);
      expect(accepted, exercise.id).toContain(normalizeJa(exercise.ja));
      expect(new Set(accepted).size, `${exercise.id} alternatives`).toBeGreaterThan(1);
    }
  });

  it("uses sentences that end in a predicate", () => {
    const endings =
      /(ですか|ますか|ませんか|です|ます|ません|ました|でした|ください|ない|なかった|くない|だ|た|る|う|く|す|つ|ぬ|ぶ|む|ぐ|い)[。]?$/;
    for (const exercise of GRAMMAR_EXERCISES) {
      if (exercise.kind === "transform") continue;
      expect(endings.test(exercise.ja.trim()), `${exercise.id}: ${exercise.ja}`).toBe(true);
    }
  });
});
