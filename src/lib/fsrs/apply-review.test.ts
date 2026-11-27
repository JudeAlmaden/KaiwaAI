import { describe, it, expect } from "vitest";
import { applyFsrsReview, type ReviewableCard } from "./apply-review";
import { DEFAULT_FSRS_PARAMETERS } from "./config";

/**
 * Regression tests for the FSRS "doom loop":
 * applyFsrsReview used to feed the stored retrievability (always 1.0 right
 * after the previous review) back into the scheduler, which zeroed the growth
 * term exp(w10*(1-R))-1 and froze stability — cards then repeated at the same
 * interval forever. Retrievability must instead be recomputed from the actual
 * time elapsed since the last review.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function makeCard(overrides: Partial<ReviewableCard> = {}): ReviewableCard {
  return {
    id: "card-1",
    userId: "user-1",
    easeFactor: 2.5,
    interval: 2,
    repetitions: 2,
    status: "learning",
    nextReview: new Date(Date.now() - 1000), // due
    lastReviewedAt: new Date(Date.now() - 2 * DAY_MS), // reviewed 2 days ago
    timesReviewed: 2,
    difficulty: 5,
    stability: 2,
    retrievability: 1.0, // stored value from the previous review
    ...overrides,
  };
}

describe("applyFsrsReview — retrievability recomputation (doom-loop regression)", () => {
  it("grows stability on a Good review when time has elapsed", () => {
    const card = makeCard();
    const result = applyFsrsReview({ card, grade: 2, cardType: "flashcard" });
    // Before the fix, stored R=1.0 zeroed the growth term and stability stayed 2.
    expect(result.stability).toBeGreaterThan(card.stability!);
    expect(result.interval).toBeGreaterThan(card.interval);
  });

  it("grows stability more after a long gap than an immediate re-review", () => {
    const longGap = makeCard({
      lastReviewedAt: new Date(Date.now() - 2 * DAY_MS),
    });
    const justNow = makeCard({
      lastReviewedAt: new Date(Date.now() - 60 * 1000),
    });

    const rLong = applyFsrsReview({ card: longGap, grade: 2, cardType: "flashcard" });
    const rNow = applyFsrsReview({ card: justNow, grade: 2, cardType: "flashcard" });

    expect(rLong.stability).toBeGreaterThan(rNow.stability ?? NaN);
  });

  it("keeps new-card initialization on the FSRS initial-stability path", () => {
    const card = makeCard({
      repetitions: 0,
      timesReviewed: 0,
      difficulty: null,
      stability: null,
      retrievability: null,
      interval: 0,
      lastReviewedAt: null,
    });
    const r = applyFsrsReview({ card, grade: 2, cardType: "flashcard" });
    expect(r.stability).toBe(DEFAULT_FSRS_PARAMETERS[2]);
  });

  it("produces finite state for degenerate inputs (D=10, S=0.1, reviewed just now)", () => {
    const card = makeCard({ difficulty: 10, stability: 0.1, lastReviewedAt: new Date() });
    const r = applyFsrsReview({ card, grade: 2, cardType: "flashcard" });
    expect(Number.isFinite(r.stability)).toBe(true);
    expect(Number.isFinite(r.difficulty ?? NaN)).toBe(true);
  });

  it("keeps an immediate early review finite and never below the incoming stability", () => {
    const card = makeCard({
      nextReview: new Date(Date.now() + DAY_MS), // early
      stability: 30,
      lastReviewedAt: new Date(), // 0 days elapsed
    });
    const r = applyFsrsReview({ card, grade: 2, cardType: "flashcard" });
    expect(Number.isFinite(r.stability)).toBe(true);
    expect(r.stability).toBeGreaterThanOrEqual(card.stability!);
  });

  it("never shortens the interval of a card graded before it is due", () => {
    const card = makeCard({
      interval: 10,
      stability: 10,
      nextReview: new Date(Date.now() + 5 * DAY_MS),
      lastReviewedAt: new Date(Date.now() - 5 * DAY_MS),
    });
    const r = applyFsrsReview({ card, grade: 2, cardType: "flashcard" });
    expect(r.nextReview.getTime()).toBeGreaterThanOrEqual(card.nextReview!.getTime());
    expect(r.interval).toBeGreaterThanOrEqual(card.interval);
    expect(r.lastReviewedAt).not.toEqual(card.lastReviewedAt);
  });

  it("earns less growth when reviewed early than on time", () => {
    const base = { difficulty: 5, stability: 20, interval: 20, repetitions: 4 };
    const early = applyFsrsReview({
      card: makeCard({
        ...base,
        nextReview: new Date(Date.now() + 15 * DAY_MS),
        lastReviewedAt: new Date(Date.now() - 5 * DAY_MS),
      }),
      grade: 2,
      cardType: "flashcard",
    });
    const onTime = applyFsrsReview({
      card: makeCard({
        ...base,
        nextReview: new Date(Date.now() - 1000),
        lastReviewedAt: new Date(Date.now() - 20 * DAY_MS),
      }),
      grade: 2,
      cardType: "flashcard",
    });
    expect(early.stability!).toBeLessThan(onTime.stability!);
  });

  it("preserves repetitions on Again while dropping interval and status to learning", () => {
    const card = makeCard({
      repetitions: 5,
      interval: 30,
      status: "known",
      stability: 30,
      timesReviewed: 5,
    });
    const r = applyFsrsReview({ card, grade: 0, cardType: "flashcard" });
    expect(r.repetitions).toBe(5);
    expect(r.interval).toBe(0);
    expect(r.status).toBe("learning");
  });
});
