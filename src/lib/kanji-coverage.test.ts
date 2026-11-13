import { describe, expect, it } from "vitest";
import {
  buildKanjiCoverage,
  COVERAGE_LEVELS,
  jlptLevelToCoverageLevel,
} from "./kanji-coverage";

describe("jlptLevelToCoverageLevel", () => {
  it("maps Prisma's 5..1 scale onto N5..N1", () => {
    expect(jlptLevelToCoverageLevel(5)).toBe("N5");
    expect(jlptLevelToCoverageLevel(1)).toBe("N1");
  });

  it("returns null for unknown levels", () => {
    expect(jlptLevelToCoverageLevel(null)).toBeNull();
    expect(jlptLevelToCoverageLevel(0)).toBeNull();
    expect(jlptLevelToCoverageLevel(6)).toBeNull();
  });
});

describe("buildKanjiCoverage", () => {
  it("always returns every level in N5 → N1 order", () => {
    const buckets = buildKanjiCoverage([]);
    expect(buckets.map((b) => b.level)).toEqual([...COVERAGE_LEVELS]);
    expect(buckets.every((b) => b.total === 0)).toBe(true);
  });

  it("counts known and in-progress cards separately", () => {
    const buckets = buildKanjiCoverage([
      { character: "日", jlptLevel: 5, status: "known" },
      { character: "月", jlptLevel: 5, status: "learning" },
      { character: "火", jlptLevel: 5, status: "new" },
      { character: "水", jlptLevel: 5, status: null },
      { character: "木", jlptLevel: 4, status: "known" },
    ]);

    const n5 = buckets.find((b) => b.level === "N5")!;
    expect(n5.total).toBe(4);
    expect(n5.known).toBe(1);
    expect(n5.learning).toBe(2); // learning + added-but-unstudied
    expect(n5.cells).toHaveLength(4);
    expect(n5.cells[2]).toEqual({ character: "火", status: "new" });

    const n4 = buckets.find((b) => b.level === "N4")!;
    expect(n4.total).toBe(1);
    expect(n4.known).toBe(1);
  });

  it("drops rows without a JLPT level instead of inventing a bucket", () => {
    const buckets = buildKanjiCoverage([
      { character: "鬱", jlptLevel: null, status: "known" },
    ]);
    expect(buckets.reduce((sum, b) => sum + b.total, 0)).toBe(0);
  });
});
