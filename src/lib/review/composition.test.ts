import { describe, expect, it } from "vitest";
import {
  formatComposition,
  isNewCard,
  projectSessionMix,
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

describe("projectSessionMix", () => {
  const base = { learningRatio: 0.5, maxNewCards: 20 };

  it("rations new cards to the per-session quota", () => {
    const mix = projectSessionMix({ new: 16, review: 139 }, { ...base, maxNewPerSession: 3, maxReviews: 10 });
    expect(mix).toEqual({ newCount: 3, reviewCount: 7, total: 10 });
  });

  it("splits a balanced session 50/50 without a quota", () => {
    const mix = projectSessionMix({ new: 10, review: 10 }, { ...base, maxReviews: 20 });
    expect(mix).toEqual({ newCount: 10, reviewCount: 10, total: 20 });
  });

  it("honours the daily new-card ceiling", () => {
    const mix = projectSessionMix(
      { new: 40, review: 40 },
      { learningRatio: 0.5, maxNewCards: 5, maxReviews: 20 }
    );
    expect(mix.newCount).toBe(5);
    expect(mix.reviewCount).toBe(15);
  });

  it("never pads a session with new cards when reviews are missing", () => {
    const mix = projectSessionMix({ new: 30, review: 2 }, { ...base, maxReviews: 10 });
    expect(mix).toEqual({ newCount: 5, reviewCount: 2, total: 7 });
  });

  it("fills with reviews when there are no new cards", () => {
    const mix = projectSessionMix({ new: 0, review: 12 }, { ...base, maxReviews: 50 });
    expect(mix).toEqual({ newCount: 0, reviewCount: 12, total: 12 });
  });

  it("caps a fresh deck at the active share", () => {
    const mix = projectSessionMix({ new: 8, review: 0 }, { ...base, maxReviews: 10 });
    // Size 8 → active target 4; reviews can't fill the rest, and new cards never pad.
    expect(mix).toEqual({ newCount: 4, reviewCount: 0, total: 4 });
  });

  it("excludes new cards entirely at ratio 0", () => {
    const mix = projectSessionMix(
      { new: 10, review: 4 },
      { learningRatio: 0, maxNewCards: 20, maxNewPerSession: 3, maxReviews: 10 }
    );
    expect(mix).toEqual({ newCount: 0, reviewCount: 4, total: 4 });
  });

  it("drops new cards when the learning pool is full", () => {
    const mix = projectSessionMix(
      { new: 10, review: 10 },
      { ...base, maxNewPerSession: 3, maxReviews: 10, inProgress: 48, maxLearningPool: 20 }
    );
    expect(mix).toEqual({ newCount: 0, reviewCount: 10, total: 10 });
  });

  it("ignores the learning cap when it is unlimited", () => {
    const mix = projectSessionMix(
      { new: 10, review: 10 },
      { ...base, maxNewPerSession: 3, maxReviews: 10, inProgress: 48, maxLearningPool: 0 }
    );
    expect(mix.newCount).toBe(3);
  });

  it("still introduces new cards just below the cap", () => {
    const mix = projectSessionMix(
      { new: 10, review: 10 },
      { ...base, maxNewPerSession: 3, maxReviews: 10, inProgress: 19, maxLearningPool: 20 }
    );
    expect(mix.newCount).toBe(3);
  });

  it("returns zeroes for an empty deck", () => {
    expect(projectSessionMix({ new: 0, review: 0 }, base)).toEqual({
      newCount: 0,
      reviewCount: 0,
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
