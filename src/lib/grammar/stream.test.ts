import { describe, expect, it } from "vitest";
import { GRAMMAR_EXERCISES } from "./exercises";
import type { ConceptStats } from "./mastery";
import { nextInStream, rememberConcept, rememberRecent } from "./stream";

const now = new Date("2026-01-01T00:00:00Z");

function stat(
  concept: string,
  attempts: number,
  correct: number,
  streak = 0,
  dueAt: string | Date | null = null
): ConceptStats {
  return { concept, attempts, correct, streak, dueAt };
}

describe("recent buffers", () => {
  it("moves an item to the end and keeps only the limit", () => {
    expect(rememberRecent(["a", "b"], "c", 2)).toEqual(["b", "c"]);
    expect(rememberConcept(["wa", "ga"], "wa", 2)).toEqual(["ga", "wa"]);
  });
});

describe("endless stream", () => {
  it("serves an exercise with no progress at all", () => {
    const picked = nextInStream({ exercises: GRAMMAR_EXERCISES, stats: {}, seed: 1, now });
    expect(picked).not.toBeNull();
  });

  it("returns null only when the bank is empty", () => {
    expect(nextInStream({ exercises: [], stats: {}, seed: 1, now })).toBeNull();
  });

  it("never repeats an id from the recent buffer", () => {
    const recentIds = GRAMMAR_EXERCISES.slice(0, 8).map((exercise) => exercise.id);
    for (let seed = 0; seed < 5; seed += 1) {
      const picked = nextInStream({
        exercises: GRAMMAR_EXERCISES,
        stats: {},
        recentIds,
        seed,
        now,
      });
      expect(picked).not.toBeNull();
      expect(recentIds).not.toContain(picked?.id);
    }
  });

  it("falls back to the whole bank once everything has been seen", () => {
    const exercises = GRAMMAR_EXERCISES.filter((item) => item.concept === "word-order");
    const recentIds = exercises.map((item) => item.id);
    const picked = nextInStream({ exercises, stats: {}, recentIds, seed: 1, now });
    expect(picked).not.toBeNull();
  });

  it("sticks to the focused topic", () => {
    for (let seed = 0; seed < 5; seed += 1) {
      const picked = nextInStream({
        exercises: GRAMMAR_EXERCISES,
        stats: {},
        focusConcept: "particle-wa",
        seed,
        now,
      });
      expect(picked?.concept).toBe("particle-wa");
    }
  });

  it("prefers the weaker concept", () => {
    const exercises = GRAMMAR_EXERCISES.filter(
      (item) => item.concept === "word-order" || item.concept === "desu"
    );
    const stats = {
      "word-order": stat("word-order", 6, 2, 0, now.toISOString()),
      desu: stat("desu", 8, 8, 3, new Date(now.getTime() + 86_400_000).toISOString()),
    };
    const picks = [0, 1, 2].map((seed) =>
      nextInStream({ exercises, stats, seed, now })
    );
    expect(picks.filter((item) => item?.concept === "word-order").length).toBeGreaterThan(0);
    expect(picks.filter((item) => item?.concept === "desu").length).toBe(0);
  });

  it("rotates topics instead of drilling one", () => {
    const exercises = GRAMMAR_EXERCISES.filter(
      (item) => item.concept === "word-order" || item.concept === "desu"
    );
    const stats = {};
    const recentIds: string[] = [];
    const recentConcepts: string[] = [];
    const concepts: string[] = [];

    for (let index = 0; index < 4; index += 1) {
      const picked = nextInStream({
        exercises,
        stats,
        recentIds,
        recentConcepts,
        seed: index,
        now,
      });
      if (!picked) break;
      concepts.push(picked.concept);
      recentIds.push(picked.id);
      recentConcepts.push(picked.concept);
    }

    expect(new Set(concepts).size).toBe(2);
  });

  it("avoids repeating the last exercise kind for a concept", () => {
    const exercises = GRAMMAR_EXERCISES.filter((item) => item.concept === "verb-godan");
    const stats = { "verb-godan": stat("verb-godan", 6, 5, 2) };
    const picked = nextInStream({
      exercises,
      stats,
      lastKindByConcept: { "verb-godan": "transform" },
      seed: 1,
      now,
    });
    expect(picked?.concept).toBe("verb-godan");
    expect(picked?.kind).not.toBe("transform");
  });
});
