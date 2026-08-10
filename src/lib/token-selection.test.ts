import { describe, expect, it } from "vitest";
import { moveRangeEdge, rangeText } from "./token-selection";
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
});
