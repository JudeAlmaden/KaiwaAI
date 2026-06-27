import { describe, it, expect } from "vitest";
import { advanceStreak, currentStreak } from "./streak";

describe("advanceStreak", () => {
  it("starts a streak at 1 for a first-ever active day", () => {
    const r = advanceStreak(
      { streakCount: 0, streakBestCount: 0, lastStreakDay: null },
      "2026-06-27",
      "2026-06-26"
    );
    expect(r?.streakCount).toBe(1);
    expect(r?.streakBestCount).toBe(1);
    expect(r?.lastStreakDay).toBe("2026-06-27");
  });

  it("increments on a consecutive day", () => {
    const r = advanceStreak(
      { streakCount: 3, streakBestCount: 3, lastStreakDay: "2026-06-26" },
      "2026-06-27",
      "2026-06-26"
    );
    expect(r?.streakCount).toBe(4);
    expect(r?.streakBestCount).toBe(4);
  });

  it("resets to 1 after a gap, keeping the best", () => {
    const r = advanceStreak(
      { streakCount: 9, streakBestCount: 9, lastStreakDay: "2026-06-20" },
      "2026-06-27",
      "2026-06-26"
    );
    expect(r?.streakCount).toBe(1);
    expect(r?.streakBestCount).toBe(9); // best preserved
  });

  it("does nothing if already counted today", () => {
    const r = advanceStreak(
      { streakCount: 5, streakBestCount: 7, lastStreakDay: "2026-06-27" },
      "2026-06-27",
      "2026-06-26"
    );
    expect(r).toBeNull();
  });
});

describe("currentStreak", () => {
  const state = { streakCount: 5, streakBestCount: 8, lastStreakDay: "2026-06-26" };

  it("shows the streak if last active was yesterday", () => {
    expect(currentStreak(state, "2026-06-27", "2026-06-26")).toBe(5);
  });

  it("shows the streak if last active was today", () => {
    expect(
      currentStreak({ ...state, lastStreakDay: "2026-06-27" }, "2026-06-27", "2026-06-26")
    ).toBe(5);
  });

  it("shows 0 if the streak lapsed (older than yesterday)", () => {
    expect(
      currentStreak({ ...state, lastStreakDay: "2026-06-20" }, "2026-06-27", "2026-06-26")
    ).toBe(0);
  });
});
