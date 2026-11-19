import { describe, expect, it } from "vitest";
import { clampSessionToDailyCap, remainingDailyReviews } from "./daily-cap";

describe("remainingDailyReviews", () => {
  it("returns undefined when no cap is configured", () => {
    expect(remainingDailyReviews(undefined, 12)).toBeUndefined();
    expect(remainingDailyReviews(null, 12)).toBeUndefined();
  });

  it("subtracts reviews already done today", () => {
    expect(remainingDailyReviews(50, 12)).toBe(38);
    expect(remainingDailyReviews(50, 0)).toBe(50);
  });

  it("never goes below zero when the ceiling is passed", () => {
    expect(remainingDailyReviews(20, 25)).toBe(0);
    expect(remainingDailyReviews(20, 20)).toBe(0);
  });

  it("treats negatives and junk as zero work done", () => {
    expect(remainingDailyReviews(10, -3)).toBe(10);
    expect(remainingDailyReviews(10, Number.NaN)).toBe(10);
  });
});

describe("clampSessionToDailyCap", () => {
  it("leaves the session alone without a cap", () => {
    expect(clampSessionToDailyCap(50, undefined)).toBe(50);
  });

  it("caps a session at what is left of the day", () => {
    expect(clampSessionToDailyCap(50, 8)).toBe(8);
    expect(clampSessionToDailyCap(10, 200)).toBe(10);
  });

  it("collapses to zero once the day is used up", () => {
    expect(clampSessionToDailyCap(50, 0)).toBe(0);
  });

  it("clamps junk input instead of returning NaN", () => {
    expect(clampSessionToDailyCap(Number.NaN, 5)).toBe(0);
    expect(clampSessionToDailyCap(10, Number.NaN)).toBe(0);
  });
});
