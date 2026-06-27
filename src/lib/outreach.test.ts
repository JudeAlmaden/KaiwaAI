import { describe, it, expect } from "vitest";
import { moodFor, canReachOut, inQuietHours, DORMANT_AFTER } from "./outreach";

describe("mood ladder", () => {
  it("climbs from cheerful to dormant as ignores accumulate", () => {
    expect(moodFor(0)).toBe("cheerful");
    expect(moodFor(1)).toBe("hopeful");
    expect(moodFor(2)).toBe("wistful");
    expect(moodFor(3)).toBe("wistful");
    expect(moodFor(4)).toBe("sad");
    expect(moodFor(5)).toBe("sad");
    expect(moodFor(6)).toBe("givingUp");
    expect(moodFor(DORMANT_AFTER)).toBe("dormant");
    expect(moodFor(99)).toBe("dormant");
  });
});

describe("quiet hours", () => {
  it("handles a normal window", () => {
    expect(inQuietHours(3, 1, 6)).toBe(true);
    expect(inQuietHours(7, 1, 6)).toBe(false);
  });
  it("handles a window that wraps midnight (22→8)", () => {
    expect(inQuietHours(23, 22, 8)).toBe(true);
    expect(inQuietHours(2, 22, 8)).toBe(true);
    expect(inQuietHours(12, 22, 8)).toBe(false);
  });
});

describe("canReachOut", () => {
  const base = {
    consecutiveIgnored: 0,
    hourLocal: 14,
    minutesLocal: 3,
    quietStart: 22,
    quietEnd: 8,
    lastOutreachAt: null,
    now: new Date("2026-06-27T14:03:00Z"),
    scheduledTimes: ["14:00"],
  };

  it("refuses when outreach is off", () => {
    expect(canReachOut({ ...base, mode: "off" }).ok).toBe(false);
  });

  it("refuses when dormant", () => {
    expect(canReachOut({ ...base, mode: "random", consecutiveIgnored: 9 }).ok).toBe(
      false
    );
  });

  it("refuses during quiet hours", () => {
    expect(canReachOut({ ...base, mode: "random", hourLocal: 2 }).ok).toBe(false);
  });

  it("random mode fires within active hours", () => {
    expect(canReachOut({ ...base, mode: "random" }).ok).toBe(true);
  });

  it("scheduled mode fires within 10 min of a set time", () => {
    expect(canReachOut({ ...base, mode: "scheduled" }).ok).toBe(true);
    expect(
      canReachOut({ ...base, mode: "scheduled", minutesLocal: 30 }).ok
    ).toBe(false);
  });

  it("throttles if Kai reached out less than 6h ago", () => {
    const recent = new Date(base.now.getTime() - 2 * 3.6e6);
    expect(
      canReachOut({ ...base, mode: "random", lastOutreachAt: recent }).ok
    ).toBe(false);
  });
});
