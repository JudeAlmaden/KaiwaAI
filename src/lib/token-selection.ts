import type { CachedToken } from "./types";

export type TokenRange = { start: number; end: number };
export type RangeEdge = "start" | "end";

const JP_RUN = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFFー々]+/g;

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

/** Shorten display labels (lookup button, headers) with an ASCII ellipsis. */
export function truncateText(text: string, maxLen: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  if (maxLen <= 3) return trimmed.slice(0, maxLen);
  return `${trimmed.slice(0, maxLen - 3)}...`;
}

/** Pull Japanese runs out of a drag-selection that may include English or emoji. */
export function extractJapaneseSelection(text: string, maxLen = 60): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const runs = [...trimmed.matchAll(JP_RUN)].map((m) => m[0]);
  if (runs.length === 0) return null;

  const joined = runs.join("");
  if (joined.length <= maxLen) return joined;

  const fitting = runs.filter((run) => run.length <= maxLen);
  if (fitting.length > 0) {
    return fitting.reduce((longest, run) => (run.length >= longest.length ? run : longest));
  }
  return runs[0].slice(0, maxLen);
}

/** Anchor popups to the selection end (where the cursor finished), not the full block top. */
export function selectionAnchorRect(range: Range): DOMRect {
  const rects = range.getClientRects();
  if (rects.length === 0) return range.getBoundingClientRect();
  return rects[rects.length - 1];
}
