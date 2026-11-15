import { describe, expect, it } from "vitest";
import { LEARNING_CARD_WHERE, isNewCard } from "./lifecycle";
import { activeTargetFor } from "../session-composer";

describe("card lifecycle — new vs lapsed", () => {
  it("treats a never-graded card as new", () => {
    expect(isNewCard({ repetitions: 0, timesReviewed: 0 })).toBe(true);
    expect(isNewCard({ repetitions: 0 })).toBe(true);
  });

  it("does not treat a lapsed card as new", () => {
    expect(isNewCard({ repetitions: 0, timesReviewed: 9 })).toBe(false);
  });

  it("keeps a lapsed card in the in-progress pool", () => {
    const serialized = JSON.stringify(LEARNING_CARD_WHERE);
    expect(serialized).toContain('"repetitions":0');
    expect(serialized).toContain('"timesReviewed":{"gt":0}');
  });
});

describe("activeTargetFor", () => {
  it("matches the composer's split", () => {
    expect(activeTargetFor(10, 0.5)).toBe(5);
    expect(activeTargetFor(0, 0.5)).toBe(0);
    expect(activeTargetFor(10, 0)).toBe(0);
    expect(activeTargetFor(3, 0.01)).toBe(1);
  });
});
