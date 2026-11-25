import { describe, expect, it } from "vitest";
import {
  accuracyOf,
  applyAttempt,
  dimensionAccuracy,
  dimensionForStage,
  feedbackDepth,
  nextDueAt,
  practiceWeight,
  stageFor,
  usesChoices,
  withDimensionAttempt,
} from "./conjugation-mastery";

const stats = (attempts: number, correct: number, streak = 0) => ({
  pattern: "masu",
  attempts,
  correct,
  streak,
});

describe("stageFor", () => {
  it("starts at recognition", () => {
    expect(stageFor(null)).toBe(1);
    expect(stageFor(stats(0, 0))).toBe(1);
    expect(stageFor(stats(1, 1, 1))).toBe(1);
  });

  it("moves through understanding and transformation", () => {
    expect(stageFor(stats(2, 2, 2))).toBe(2);
    expect(stageFor(stats(4, 3, 0))).toBe(3);
    expect(stageFor(stats(5, 5, 5))).toBe(3);
  });

  it("reaches application only with accuracy and a streak", () => {
    expect(stageFor(stats(6, 6, 3))).toBe(4);
    expect(stageFor(stats(8, 5, 4))).toBe(3);
    expect(stageFor(stats(6, 6, 1))).toBe(3);
  });
});

describe("usesChoices", () => {
  it("keeps choices while the pattern is shaky", () => {
    expect(usesChoices(1, null)).toBe(true);
    expect(usesChoices(2, stats(3, 1, 0))).toBe(true);
    expect(usesChoices(3, stats(4, 1, 0))).toBe(true);
  });

  it("removes choices once the pattern is steady", () => {
    expect(usesChoices(3, stats(5, 5, 3))).toBe(false);
    expect(usesChoices(4, stats(6, 6, 3))).toBe(false);
  });
});

describe("scheduling", () => {
  it("brings misses back inside the session", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(nextDueAt(false, 0, now).getTime() - now.getTime()).toBe(60_000);
  });

  it("spaces correct answers further with each streak", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const first = nextDueAt(true, 1, now).getTime() - now.getTime();
    const second = nextDueAt(true, 2, now).getTime() - now.getTime();
    const third = nextDueAt(true, 4, now).getTime() - now.getTime();
    expect(second).toBeGreaterThan(first);
    expect(third).toBeGreaterThan(second);
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

describe("practiceWeight", () => {
  it("puts weak patterns before strong ones", () => {
    const weak = { ...stats(6, 2, 0), dueAt: new Date(0).toISOString() };
    const strong = stats(6, 6, 6);
    expect(practiceWeight(weak)).toBeLessThan(practiceWeight(strong));
    expect(accuracyOf(weak)).toBeCloseTo(0.333, 2);
  });

  it("uses the current stage's dimension when it has evidence", () => {
    const weakConstruction = {
      ...stats(4, 3, 1),
      recognitionAttempts: 10,
      recognitionCorrect: 10,
      constructionAttempts: 4,
      constructionCorrect: 1,
    };
    const strongConstruction = {
      ...weakConstruction,
      constructionCorrect: 4,
    };
    expect(practiceWeight(weakConstruction)).toBeLessThan(practiceWeight(strongConstruction));
    expect(dimensionAccuracy(weakConstruction, "construction")).toBe(0.25);
  });
});

describe("dimensions", () => {
  it("maps stages to the skill they measure", () => {
    expect(dimensionForStage(1)).toBe("recognition");
    expect(dimensionForStage(2)).toBe("recognition");
    expect(dimensionForStage(3)).toBe("construction");
    expect(dimensionForStage(4)).toBe("application");
  });

  it("counts each dimension without touching the others", () => {
    const next = withDimensionAttempt(
      { ...stats(3, 2, 1), recognitionAttempts: 2, recognitionCorrect: 2 },
      "construction",
      false
    );
    expect(next.constructionAttempts).toBe(1);
    expect(next.constructionCorrect).toBe(0);
    expect(next.recognitionAttempts).toBe(2);
    expect(next.applicationAttempts).toBe(0);
  });
});

describe("feedbackDepth", () => {
  it("gives misses the full rule", () => {
    expect(
      feedbackDepth({ correct: false, hintsUsed: 0, stats: stats(6, 6, 6), stage: 4 })
    ).toBe("detailed");
  });

  it("reinforces the rule when hints were used", () => {
    expect(
      feedbackDepth({ correct: true, hintsUsed: 1, stats: stats(6, 6, 6), stage: 4 })
    ).toBe("standard");
  });

  it("keeps a steady learner's feedback brief", () => {
    expect(
      feedbackDepth({
        correct: true,
        hintsUsed: 0,
        stats: {
          ...stats(6, 6, 3),
          applicationAttempts: 4,
          applicationCorrect: 4,
        },
        stage: 4,
      })
    ).toBe("brief");
  });
});
