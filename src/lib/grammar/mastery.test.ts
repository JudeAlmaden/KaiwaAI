import { describe, expect, it } from "vitest";
import {
  accuracyOf,
  applyAttempt,
  difficultyFit,
  masteryScore,
  nextDueAt,
  practiceWeight,
  targetDifficulty,
  type ConceptStats,
} from "./mastery";

function stat(
  concept: string,
  attempts: number,
  correct: number,
  streak = 0,
  dueAt: string | Date | null = null
): ConceptStats {
  return { concept, attempts, correct, streak, dueAt };
}

const now = new Date("2026-01-01T00:00:00Z");

describe("mastery score", () => {
  it("starts at zero and grows with accuracy and volume", () => {
    expect(masteryScore(null)).toBe(0);
    const shaky = masteryScore(stat("word-order", 4, 2, 0));
    const solid = masteryScore(stat("word-order", 10, 9, 3));
    expect(solid).toBeGreaterThan(shaky);
    expect(solid).toBeLessThanOrEqual(1);
  });

  it("raises the difficulty target as mastery grows", () => {
    expect(targetDifficulty(null)).toBe(1);
    expect(targetDifficulty(stat("word-order", 12, 12, 4))).toBeGreaterThan(4);
  });
});

describe("accuracy", () => {
  it("is zero without attempts and correct ratio otherwise", () => {
    expect(accuracyOf(null)).toBe(0);
    expect(accuracyOf(stat("word-order", 4, 3))).toBeCloseTo(0.75);
  });
});

describe("difficulty fit", () => {
  it("prefers harder exercises for strong concepts", () => {
    const strong = stat("word-order", 12, 11, 4);
    expect(difficultyFit(5, strong)).toBeLessThan(difficultyFit(1, strong));
  });

  it("prefers easier exercises for shaky concepts", () => {
    const shaky = stat("word-order", 6, 2, 0);
    expect(difficultyFit(1, shaky)).toBeLessThan(difficultyFit(5, shaky));
  });
});

describe("scheduling", () => {
  it("brings a miss back within the sitting", () => {
    expect(nextDueAt(false, 0, now).getTime() - now.getTime()).toBe(60_000);
  });

  it("spaces correct answers further apart", () => {
    const first = nextDueAt(true, 1, now).getTime() - now.getTime();
    const second = nextDueAt(true, 2, now).getTime() - now.getTime();
    const later = nextDueAt(true, 4, now).getTime() - now.getTime();
    expect(second).toBeGreaterThan(first);
    expect(later).toBeGreaterThan(second);
  });

  it("counts attempts and resets the streak on a miss", () => {
    expect(applyAttempt(null, true)).toMatchObject({ attempts: 1, correct: 1, streak: 1 });
    expect(applyAttempt({ attempts: 3, correct: 2, streak: 2 }, false)).toMatchObject({
      attempts: 4,
      correct: 2,
      streak: 0,
    });
  });
});

describe("practice weight", () => {
  it("pulls overdue concepts forward and holds fresh ones back", () => {
    const overdue = stat("word-order", 4, 4, 2, new Date(now.getTime() - 86_400_000));
    const scheduled = stat("word-order", 4, 4, 2, new Date(now.getTime() + 86_400_000));
    expect(practiceWeight(overdue, now)).toBeLessThan(practiceWeight(scheduled, now));
  });
});
