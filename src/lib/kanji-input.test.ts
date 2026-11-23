import { describe, it, expect } from "vitest";
import { normalizeKanjiCharacter } from "./kanji-input";

describe("normalizeKanjiCharacter", () => {
  it("keeps a single kanji and trims surrounding whitespace", () => {
    expect(normalizeKanjiCharacter("  六 ")).toBe("六");
  });

  it("folds compatibility forms before counting characters", () => {
    expect(normalizeKanjiCharacter("ｶ")).toBe("カ");
  });

  it("rejects more than one character", () => {
    expect(normalizeKanjiCharacter("六六")).toBeNull();
  });

  it("rejects empty and whitespace-only input", () => {
    expect(normalizeKanjiCharacter("")).toBeNull();
    expect(normalizeKanjiCharacter("   ")).toBeNull();
  });

  it("rejects non-kanji words", () => {
    expect(normalizeKanjiCharacter("six")).toBeNull();
  });
});
