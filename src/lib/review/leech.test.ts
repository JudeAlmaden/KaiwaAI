import { describe, expect, it } from "vitest";
import { isLeech, LEECH_MAX_INTERVAL_DAYS, LEECH_MIN_LAPSES } from "./leech";

describe("isLeech", () => {
  it("flags a card that has lapsed repeatedly and is still back within a week", () => {
    expect(isLeech({ lapses: LEECH_MIN_LAPSES, interval: 1 })).toBe(true);
  });

  it("does not flag a card with too few lapses", () => {
    expect(isLeech({ lapses: LEECH_MIN_LAPSES - 1, interval: 0 })).toBe(false);
  });

  it("does not flag a card whose interval has grown past a week", () => {
    expect(isLeech({ lapses: 10, interval: LEECH_MAX_INTERVAL_DAYS })).toBe(false);
  });

  it("treats missing counters as zero", () => {
    expect(isLeech({})).toBe(false);
    expect(isLeech({ lapses: null, interval: null })).toBe(false);
  });

  it("matches the leech deck filter boundary (3 lapses, interval < 7)", () => {
    expect(isLeech({ lapses: 3, interval: 6 })).toBe(true);
    expect(isLeech({ lapses: 3, interval: 7 })).toBe(false);
  });

  it("does not flag a heavily reviewed card that never failed", () => {
    expect(isLeech({ lapses: 0, interval: 3 })).toBe(false);
  });
});
