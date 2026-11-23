import { describe, it, expect } from "vitest";
import { canBreakdown } from "./breakdown";

describe("canBreakdown", () => {
  it("allows a vocabulary card with a word", () => {
    expect(canBreakdown({ word: "忙しい" })).toBe(true);
  });

  it("allows a kanji card with a character", () => {
    expect(canBreakdown({ character: "忙" })).toBe(true);
  });

  it("rejects cards with nothing to explain", () => {
    expect(canBreakdown({})).toBe(false);
    expect(canBreakdown({ word: "   ", character: "" })).toBe(false);
  });
});
