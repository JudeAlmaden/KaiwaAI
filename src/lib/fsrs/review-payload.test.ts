import { describe, expect, it } from "vitest";
import {
  applyFsrsReview,
  buildReviewPersistData,
  type ReviewableCard,
  type ReviewUpdatePayload,
} from "./apply-review";

const DAY_MS = 24 * 60 * 60 * 1000;

function makeCard(overrides: Partial<ReviewableCard> = {}): ReviewableCard {
  return {
    id: "card-1",
    userId: "user-1",
    easeFactor: 2.5,
    interval: 2,
    repetitions: 2,
    status: "learning",
    nextReview: new Date(Date.now() - 1000),
    lastReviewedAt: new Date(Date.now() - 2 * DAY_MS),
    timesReviewed: 2,
    difficulty: 5,
    stability: 2,
    retrievability: 1,
    ...overrides,
  };
}

describe("applyFsrsReview — payload rules", () => {
  it("stores interval 0 on a lapse so it matches the 10-minute return", () => {
    const result = applyFsrsReview({ card: makeCard(), grade: 0, cardType: "flashcard" });
    expect(result.repetitions).toBe(2);
    expect(result.interval).toBe(0);
    expect(result.touchLastReviewed).not.toBe(false);
    expect(buildReviewPersistData(result).interval).toBe(0);
    expect(result.lapsesIncrement).toBe(1);
    expect(buildReviewPersistData(result).lapses).toEqual({ increment: 1 });
  });

  it("does not count a blocked-session grade 0 as a lapse and spaces it 4 hours out", () => {
    const before = Date.now();
    const result = applyFsrsReview({
      card: makeCard({ nextReview: new Date(Date.now() - DAY_MS) }),
      grade: 0,
      cardType: "flashcard",
      earlyReviewStrategy: "proportional",
      suppressLapse: true,
    });
    expect(result.lapsesIncrement).toBe(0);
    const diffMs = result.nextReview.getTime() - before;
    expect(diffMs).toBeGreaterThanOrEqual(3.9 * 60 * 60 * 1000);
  });

  it("does not count an early review as a lapse", () => {
    const result = applyFsrsReview({
      card: makeCard({ nextReview: new Date(Date.now() + 5 * DAY_MS) }),
      grade: 0,
      cardType: "flashcard",
      earlyReviewStrategy: "proportional",
    });
    expect(result.lapsesIncrement).toBe(0);
    expect(buildReviewPersistData(result).lapses).toBeUndefined();
  });

  it("does not move the scheduling clock for an early practice review", () => {
    const result = applyFsrsReview({
      card: makeCard({ nextReview: new Date(Date.now() + 5 * DAY_MS) }),
      grade: 2,
      cardType: "flashcard",
      earlyReviewStrategy: "practice",
    });
    expect(result.touchLastReviewed).toBe(false);
    expect(buildReviewPersistData(result).lastReviewedAt).toBeUndefined();
    expect(result.timesReviewedIncrement).toBe(0);
    expect(result.lapsesIncrement).toBe(0);
  });

  it("stamps firstLearnedAt on the first success only", () => {
    const fresh = applyFsrsReview({
      card: makeCard({
        repetitions: 0,
        timesReviewed: 0,
        difficulty: null,
        stability: null,
        retrievability: null,
        lastReviewedAt: null,
        firstLearnedAt: null,
      }),
      grade: 2,
      cardType: "flashcard",
    });
    expect(fresh.firstLearnedAt).toBeInstanceOf(Date);

    // A lapsed card (reps back to 0) already has the stamp and must keep it.
    const lapsed = applyFsrsReview({
      card: makeCard({
        repetitions: 0,
        timesReviewed: 9,
        firstLearnedAt: new Date(Date.now() - 30 * DAY_MS),
      }),
      grade: 2,
      cardType: "flashcard",
    });
    expect(lapsed.firstLearnedAt).toBeUndefined();
  });
});

describe("buildReviewPersistData — fallback reset", () => {
  const base: ReviewUpdatePayload = {
    easeFactor: 2.5,
    interval: 6,
    repetitions: 1,
    status: "learning",
    nextReview: new Date(),
    difficulty: 4,
    stability: 3,
    retrievability: 1,
    lastReviewedAt: new Date(),
    timesReviewedIncrement: 1,
    lapsesIncrement: 0,
  };

  it("clears stale FSRS fields when SM-2 took over", () => {
    const data = buildReviewPersistData({ ...base, clearFsrs: true });
    expect(data.difficulty).toBeNull();
    expect(data.stability).toBeNull();
    expect(data.retrievability).toBeNull();
  });

  it("keeps FSRS fields on the normal path", () => {
    const data = buildReviewPersistData(base);
    expect(data.difficulty).toBe(4);
    expect(data.lastReviewedAt).toBeInstanceOf(Date);
  });
});
