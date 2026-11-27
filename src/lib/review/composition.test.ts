import { describe, expect, it } from "vitest";
import {
  formatComposition,
  isNewCard,
  projectQuestDelivery,
  summarizeComposition,
} from "./composition";

describe("summarizeComposition", () => {
  it("separates unstudied cards from reviewed ones", () => {
    expect(
      summarizeComposition([
        { repetitions: 0 },
        { repetitions: 3 },
        { repetitions: 1 },
        {},
      ])
    ).toEqual({ newCount: 2, reviewCount: 2 });
  });

  it("handles an empty session", () => {
    expect(summarizeComposition([])).toEqual({ newCount: 0, reviewCount: 0 });
  });

  it("treats a missing counter as new", () => {
    expect(isNewCard({})).toBe(true);
    expect(isNewCard({ repetitions: null })).toBe(true);
    expect(isNewCard({ repetitions: 1 })).toBe(false);
  });
});

describe("projectQuestDelivery", () => {
  const quest = { maxNewPerSession: 3, maxReviews: 50 };

  it("rations new cards to the per-session quota", () => {
    expect(projectQuestDelivery({ new: 19, review: 0 }, quest)).toEqual({
      new: 3,
      review: 0,
      total: 3,
    });
  });

  it("serves every due review alongside the quota", () => {
    expect(
      projectQuestDelivery({ new: 19, review: 4 }, { maxNewPerSession: 2, maxReviews: 50 })
    ).toEqual({ new: 2, review: 4, total: 6 });
  });

  it("never runs past the quest card limit, trimming reviews first", () => {
    expect(
      projectQuestDelivery({ new: 5, review: 90 }, { maxNewPerSession: 5, maxReviews: 50 })
    ).toEqual({ new: 5, review: 45, total: 50 });
  });

  it("serves only what the deck has", () => {
    expect(projectQuestDelivery({ new: 2, review: 0 }, quest)).toEqual({
      new: 2,
      review: 0,
      total: 2,
    });
  });

  it("pauses new cards when the learning pool is full", () => {
    expect(
      projectQuestDelivery(
        { new: 17, review: 2 },
        { ...quest, inProgress: 20, maxLearningPool: 20 }
      )
    ).toEqual({ new: 0, review: 2, total: 2 });
  });

  it("still introduces new cards just below the cap", () => {
    expect(
      projectQuestDelivery(
        { new: 17, review: 0 },
        { ...quest, inProgress: 19, maxLearningPool: 20 }
      )
    ).toEqual({ new: 3, review: 0, total: 3 });
  });

  it("treats a zero learning cap as unlimited", () => {
    expect(
      projectQuestDelivery(
        { new: 17, review: 0 },
        { ...quest, inProgress: 40, maxLearningPool: 0 }
      ).new
    ).toBe(3);
  });

  it("ignores due-ahead padding, which only a fill session uses", () => {
    expect(projectQuestDelivery({ new: 0, review: 0, ahead: 156 }, quest)).toEqual({
      new: 0,
      review: 0,
      total: 0,
    });
  });
});

describe("formatComposition", () => {
  it("lists reviews then new cards", () => {
    expect(formatComposition({ reviewCount: 6, newCount: 4 })).toBe("6 review · 4 new");
  });

  it("omits an empty side", () => {
    expect(formatComposition({ reviewCount: 7, newCount: 0 })).toBe("7 review");
    expect(formatComposition({ reviewCount: 0, newCount: 3 })).toBe("3 new");
    expect(formatComposition({ reviewCount: 0, newCount: 0 })).toBe("");
  });
});
