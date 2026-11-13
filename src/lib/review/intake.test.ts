import { describe, expect, it } from "vitest";
import { dailyNewRemaining, resolveNewAllowance, startOfToday } from "./intake";

describe("new-card intake", () => {
  it("subtracts cards already introduced today", () => {
    expect(dailyNewRemaining(20, 0)).toBe(20);
    expect(dailyNewRemaining(20, 7)).toBe(13);
    expect(dailyNewRemaining(20, 25)).toBe(0);
  });

  it("never returns a negative allowance", () => {
    expect(dailyNewRemaining(5, 99)).toBe(0);
    expect(dailyNewRemaining(-3, 0)).toBe(0);
  });

  it("applies the per-session quota on top of the daily ceiling", () => {
    expect(resolveNewAllowance({ maxNewCards: 20, maxNewPerSession: 3, introducedToday: 0 })).toBe(3);
    // Daily ceiling is reached: 3/day, 2 already introduced → 1 left.
    expect(resolveNewAllowance({ maxNewCards: 3, maxNewPerSession: 3, introducedToday: 2 })).toBe(1);
    expect(resolveNewAllowance({ maxNewCards: 20, maxNewPerSession: 3, introducedToday: 20 })).toBe(0);
  });

  it("treats a missing quota as unlimited", () => {
    expect(resolveNewAllowance({ maxNewCards: 6, introducedToday: 1 })).toBe(5);
  });

  it("starts the day at local midnight", () => {
    const start = startOfToday(new Date(2026, 10, 13, 15, 42));
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(10);
    expect(start.getDate()).toBe(13);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
  });
});
