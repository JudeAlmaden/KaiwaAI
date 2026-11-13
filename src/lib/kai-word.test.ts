import { describe, expect, it } from "vitest";
import { pickDailyWord } from "./kai-word";

describe("pickDailyWord", () => {
  const deck = ["水", "火", "木", "金", "土"];

  it("is stable for the same key", () => {
    const a = pickDailyWord(deck, "2026-11-13:user-1");
    const b = pickDailyWord(deck, "2026-11-13:user-1");
    expect(a).toBe(b);
  });

  it("rotates as the day changes", () => {
    const picks = new Set(
      ["2026-11-13", "2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17"].map((day) =>
        pickDailyWord(deck, `${day}:user-1`)
      )
    );
    expect(picks.size).toBeGreaterThan(1);
  });

  it("always returns an item from the deck", () => {
    for (let day = 1; day <= 40; day++) {
      expect(deck).toContain(pickDailyWord(deck, `2026-12-${day}:user-9`));
    }
  });

  it("returns null for an empty deck", () => {
    expect(pickDailyWord([], "any")).toBeNull();
  });
});
