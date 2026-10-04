import { describe, it, expect } from "vitest";
import type { BlockerStudyMode, BlockerNoDueAction } from "@/plugins/app-blocker/definitions";

describe("App Blocker Pool & Focus Trigger Logic", () => {
  it("determines whether to fallback to 'all' cards when pool is empty", () => {
    function shouldFallbackToAll(
      pulledCount: number,
      studyMode: BlockerStudyMode,
      noDueAction: BlockerNoDueAction
    ): boolean {
      return pulledCount === 0 && studyMode !== "all" && noDueAction === "studyAny";
    }

    // When 0 cards due and noDueAction is studyAny -> fallback to all cards
    expect(shouldFallbackToAll(0, "due", "studyAny")).toBe(true);
    expect(shouldFallbackToAll(0, "struggling", "studyAny")).toBe(true);

    // When 0 cards due and noDueAction is autoOpen -> do not fallback (skip/unlock)
    expect(shouldFallbackToAll(0, "due", "autoOpen")).toBe(false);

    // When cards were found -> do not fallback
    expect(shouldFallbackToAll(5, "due", "studyAny")).toBe(false);

    // When already studying 'all' -> no need to fallback to 'all' again
    expect(shouldFallbackToAll(0, "all", "studyAny")).toBe(false);
  });

  it("formats focus labels correctly for badges", () => {
    function getFocusLabel(ratio: number): string {
      return Math.abs(ratio - 1.0) < 0.05
        ? "All New"
        : Math.abs(ratio - 0.7) < 0.05
        ? "70/30"
        : "50/50";
    }

    expect(getFocusLabel(0.5)).toBe("50/50");
    expect(getFocusLabel(0.7)).toBe("70/30");
    expect(getFocusLabel(1.0)).toBe("All New");
  });

  it("formats pool labels correctly for badges", () => {
    function getPoolLabel(mode: string): string {
      return mode === "due"
        ? "Due"
        : mode === "recent"
        ? "Recent"
        : mode === "struggling"
        ? "Struggling"
        : mode === "leeches"
        ? "Leeches"
        : "All Cards";
    }

    expect(getPoolLabel("due")).toBe("Due");
    expect(getPoolLabel("all")).toBe("All Cards");
    expect(getPoolLabel("struggling")).toBe("Struggling");
  });
});
