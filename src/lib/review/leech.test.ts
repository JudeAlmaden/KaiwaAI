import { describe, expect, it } from "vitest";
import { isLeech, LEECH_MAX_INTERVAL_DAYS, LEECH_MIN_REVIEWS } from "./leech";

describe("isLeech", () => {
  it("flags a heavily reviewed card whose interval is still short", () => {
    expect(isLeech({ timesReviewed: LEECH_MIN_REVIEWS, interval: 1 })).toBe(true);
  });

  it("does not flag a card that has not been reviewed enough", () => {
    expect(isLeech({ timesReviewed: LEECH_MIN_REVIEWS - 1, interval: 0 })).toBe(false);
  });

  it("does not flag a card whose interval has grown past a week", () => {
    expect(
      isLeech({ timesReviewed: 40, interval: LEECH_MAX_INTERVAL_DAYS })
    ).toBe(false);
  });

  it("treats missing counters as zero", () => {
    expect(isLeech({})).toBe(false);
    expect(isLeech({ timesReviewed: null, interval: null })).toBe(false);
  });

  it("matches the leech deck filter boundary (8 reviews, interval < 7)", () => {
    expect(isLeech({ timesReviewed: 8, interval: 6 })).toBe(true);
    expect(isLeech({ timesReviewed: 8, interval: 7 })).toBe(false);
  });
});
