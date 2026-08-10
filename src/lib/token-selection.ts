import type { CachedToken } from "./types";

export type TokenRange = { start: number; end: number };
export type RangeEdge = "start" | "end";

export function moveRangeEdge(range: TokenRange, edge: RangeEdge, nextIndex: number): TokenRange {
  if (edge === "start") {
    return { start: Math.min(nextIndex, range.end), end: Math.max(nextIndex, range.end) };
  }
  return { start: Math.min(range.start, nextIndex), end: Math.max(range.start, nextIndex) };
}

export function rangeText(tokens: CachedToken[], range: TokenRange): string {
  return tokens
    .slice(range.start, range.end + 1)
    .map((token) => token.surface)
    .join("")
    .trim();
}
