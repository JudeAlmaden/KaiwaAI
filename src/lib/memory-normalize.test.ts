import { describe, it, expect } from "vitest";
import {
  normalizeMemorySuggestions,
  memorySimilarity,
  memoryDedupeKey,
} from "./memory-normalize";

describe("normalizeMemorySuggestions", () => {
  it("accepts legacy string[]", () => {
    const out = normalizeMemorySuggestions(["Has a cat named Pochi", ""]);
    expect(out).toEqual([
      { content: "Has a cat named Pochi", category: "fact", importance: 1 },
    ]);
  });

  it("accepts rich objects and clamps importance", () => {
    const out = normalizeMemorySuggestions([
      { content: "Studying for N4", category: "goal", importance: 9 },
      { content: "Studying for N4", category: "goal", importance: 2 },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].importance).toBe(5);
    expect(out[0].category).toBe("goal");
  });

  it("returns empty for non-arrays", () => {
    expect(normalizeMemorySuggestions(null)).toEqual([]);
    expect(normalizeMemorySuggestions("x")).toEqual([]);
  });

  it("defaults unknown category and non-numeric importance", () => {
    const out = normalizeMemorySuggestions([
      { content: "Likes tea", category: "hobby", importance: "nope" },
    ]);
    expect(out[0]).toEqual({
      content: "Likes tea",
      category: "fact",
      importance: 1,
    });
  });
});

describe("memory near-dup", () => {
  it("keys normalize punctuation/case", () => {
    expect(memoryDedupeKey("Has a Cat!")).toBe(memoryDedupeKey("has a cat"));
  });

  it("scores overlapping phrases highly", () => {
    expect(
      memorySimilarity("Has a cat named Pochi", "Has a cat named pochi")
    ).toBeGreaterThan(0.8);
  });

  it("returns 0 for empty sides", () => {
    expect(memorySimilarity("", "hello")).toBe(0);
    expect(memorySimilarity("!!!", "???")).toBe(0);
  });
});
