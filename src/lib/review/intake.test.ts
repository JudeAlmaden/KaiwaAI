import { describe, expect, it } from "vitest";
import {
  describeIntake,
  dailyNewRemaining,
  isLearningPoolFull,
  resolveNewAllowance,
  startOfToday,
} from "./intake";

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

  it("reports a ready allowance with the quota applied", () => {
    expect(
      describeIntake({
        maxNewCards: 20,
        maxNewPerSession: 3,
        introducedToday: 1,
        inProgress: 12,
        maxLearningPool: 0,
      })
    ).toEqual({ allowance: 3, reason: "ready" });
  });

  it("pauses intake when the learning pool is full", () => {
    expect(
      describeIntake({
        maxNewCards: 20,
        maxNewPerSession: 3,
        introducedToday: 0,
        inProgress: 48,
        maxLearningPool: 20,
      })
    ).toEqual({ allowance: 0, reason: "learning-pool" });
  });

  it("treats a zero learning pool as unlimited", () => {
    expect(
      describeIntake({
        maxNewCards: 20,
        maxNewPerSession: 3,
        introducedToday: 0,
        inProgress: 48,
        maxLearningPool: 0,
      }).reason
    ).toBe("ready");
  });

  it("reports the daily ceiling once it is reached", () => {
    expect(
      describeIntake({
        maxNewCards: 3,
        maxNewPerSession: 3,
        introducedToday: 3,
        inProgress: 0,
        maxLearningPool: 0,
      })
    ).toEqual({ allowance: 0, reason: "daily-ceiling" });
  });

  it("reports off when the per-session quota is zero", () => {
    expect(
      describeIntake({
        maxNewCards: 20,
        maxNewPerSession: 0,
        introducedToday: 0,
        inProgress: 0,
        maxLearningPool: 0,
      })
    ).toEqual({ allowance: 0, reason: "off" });
  });

  it("treats the learning-pool gate as full only at or above the cap", () => {
    expect(isLearningPoolFull({ inProgress: 19, maxLearningPool: 20 })).toBe(false);
    expect(isLearningPoolFull({ inProgress: 20, maxLearningPool: 20 })).toBe(true);
    expect(isLearningPoolFull({ inProgress: 48, maxLearningPool: 20 })).toBe(true);
    // 0 / missing cap means unlimited.
    expect(isLearningPoolFull({ inProgress: 48, maxLearningPool: 0 })).toBe(false);
    expect(isLearningPoolFull({ inProgress: 48 })).toBe(false);
    expect(isLearningPoolFull({})).toBe(false);
  });

  it("starts the day at midnight in the learner's timezone", () => {
    // 02:00Z on the 14th is 10:00 on the 14th in Manila (UTC+8), so today's
    // window began at 16:00Z on the 13th — not at 00:00Z.
    const now = new Date("2026-11-14T02:00:00Z");
    expect(startOfToday(now, "Asia/Manila").toISOString()).toBe("2026-11-13T16:00:00.000Z");
    expect(startOfToday(now, "UTC").toISOString()).toBe("2026-11-14T00:00:00.000Z");
    // Los Angeles is still on the 13th at 02:00Z (18:00 PST).
    expect(startOfToday(now, "America/Los_Angeles").toISOString()).toBe("2026-11-13T08:00:00.000Z");
  });

  it("falls back to server-local midnight without a timezone", () => {
    const start = startOfToday(new Date(2026, 10, 13, 15, 42));
    expect(start.getHours()).toBe(0);
    expect(start.getDate()).toBe(13);
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
