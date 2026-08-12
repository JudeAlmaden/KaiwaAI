import { describe, expect, it } from "vitest";
import { moveRangeEdge, rangeText, truncateText, extractJapaneseSelection } from "./token-selection";
import type { CachedToken } from "./types";

const tokens = ["小さい", "犬", "です"].map((surface) => ({
  surface,
  reading: surface,
  romaji: surface,
  meaning: surface,
  pos: "noun" as const,
  dictForm: surface,
})) satisfies CachedToken[];

describe("token range selection", () => {
  it("extends an end handle across complete word tokens", () => {
    const range = moveRangeEdge({ start: 0, end: 0 }, "end", 1);

    expect(range).toEqual({ start: 0, end: 1 });
    expect(rangeText(tokens, range)).toBe("小さい犬");
  });

  it("keeps the range ordered when a handle crosses the other edge", () => {
    expect(moveRangeEdge({ start: 1, end: 2 }, "start", 3)).toEqual({ start: 2, end: 3 });
    expect(moveRangeEdge({ start: 1, end: 2 }, "end", 0)).toEqual({ start: 0, end: 1 });
  });

  it("returns a single-token surface unchanged for a point range", () => {
    expect(rangeText(tokens, { start: 0, end: 0 })).toBe("小さい");
  });

  it("concatenates multi-word span surfaces without spaces (Japanese)", () => {
    expect(rangeText(tokens, { start: 0, end: 2 })).toBe("小さい犬です");
  });

  it("leaves the range intact when setting the same index on an edge", () => {
    expect(moveRangeEdge({ start: 0, end: 2 }, "end", 2)).toEqual({ start: 0, end: 2 });
    expect(moveRangeEdge({ start: 1, end: 1 }, "start", 1)).toEqual({ start: 1, end: 1 });
  });
});

describe("truncateText", () => {
  it("returns short text unchanged", () => {
    expect(truncateText("なりたい", 24)).toBe("なりたい");
  });

  it("appends an ASCII ellipsis when text exceeds maxLen", () => {
    const long = "あ".repeat(30);
    expect(truncateText(long, 12)).toBe(`${"あ".repeat(9)}...`);
    expect(truncateText(long, 12).length).toBe(12);
  });

  it("trims surrounding whitespace before measuring", () => {
    expect(truncateText("  犬  ", 10)).toBe("犬");
  });

  it("handles maxLen <= 3 by slicing without ellipsis marker", () => {
    expect(truncateText("あいうえお", 3)).toBe("あいう");
    expect(truncateText("あいうえお", 1)).toBe("あ");
  });

  it("handles exactly-at-maxLen without ellipsis", () => {
    const s = "あ".repeat(5);
    expect(truncateText(s, 5)).toBe(s);
  });
});

describe("extractJapaneseSelection", () => {
  it("returns joined Japanese when the selection fits", () => {
    expect(extractJapaneseSelection("新しい言葉ですね！ 先生")).toBe("新しい言葉ですね先生");
  });

  it("picks the longest Japanese run when the selection is too long", () => {
    const mixed =
      "Let's learn the word 先生。 It means teacher! 私はあなたの日本語の先生になりたいです。";
    expect(extractJapaneseSelection(mixed, 20)).toBe("私はあなたの日本語の先生になりたいです");
  });

  it("returns null when no Japanese is present", () => {
    expect(extractJapaneseSelection("Let's learn the word teacher")).toBeNull();
  });
});
