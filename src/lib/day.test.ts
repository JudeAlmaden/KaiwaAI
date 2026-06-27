import { describe, it, expect } from "vitest";
import { dayKeyFor, monthKeyOf, dayLabel } from "./day";

describe("day helpers", () => {
  it("formats a dayKey as YYYY-MM-DD in the given timezone", () => {
    // A UTC instant that is still the previous day in a western timezone.
    const d = new Date("2026-06-27T02:00:00Z");
    expect(dayKeyFor(d, "UTC")).toBe("2026-06-27");
    // In Los Angeles it's still June 26 at that instant.
    expect(dayKeyFor(d, "America/Los_Angeles")).toBe("2026-06-26");
  });

  it("falls back gracefully on an invalid timezone", () => {
    const d = new Date("2026-06-27T12:00:00Z");
    expect(dayKeyFor(d, "Not/AZone")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("derives the monthKey from a dayKey", () => {
    expect(monthKeyOf("2026-06-27")).toBe("2026-06");
  });

  it("labels today and yesterday", () => {
    expect(dayLabel("2026-06-27", "2026-06-27")).toBe("Today");
    expect(dayLabel("2026-06-26", "2026-06-27")).toBe("Yesterday");
  });

  it("labels older days with a readable date", () => {
    const label = dayLabel("2026-06-20", "2026-06-27");
    expect(label).not.toBe("Today");
    expect(label).not.toBe("Yesterday");
    expect(label.length).toBeGreaterThan(0);
  });
});
