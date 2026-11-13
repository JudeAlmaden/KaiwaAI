/**
 * JLPT kanji coverage — how much of each level's kanji the learner has touched.
 *
 * Pure aggregation so it can be unit-tested without a database and reused by
 * both the coverage API and any future summary widgets.
 */
export const COVERAGE_LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;

export type CoverageLevel = (typeof COVERAGE_LEVELS)[number];
export type CoverageStatus = "new" | "learning" | "known";

export type CoverageCell = {
  character: string;
  /** null = not in the learner's deck at all. */
  status: CoverageStatus | null;
};

export type CoverageBucket = {
  level: CoverageLevel;
  total: number;
  /** Cards marked known. */
  known: number;
  /** Cards in the deck but not yet mastered (includes unstudied "new"). */
  learning: number;
  cells: CoverageCell[];
};

export type CoverageRow = {
  character: string;
  jlptLevel: number | null;
  status: CoverageStatus | null;
};

/** JLPT stores 5..1 (5 = N5); null/unknown has no bucket. */
export function jlptLevelToCoverageLevel(
  jlptLevel: number | null | undefined
): CoverageLevel | null {
  switch (jlptLevel) {
    case 5:
      return "N5";
    case 4:
      return "N4";
    case 3:
      return "N3";
    case 2:
      return "N2";
    case 1:
      return "N1";
    default:
      return null;
  }
}

export function buildKanjiCoverage(rows: CoverageRow[]): CoverageBucket[] {
  const buckets = new Map<CoverageLevel, CoverageBucket>();
  for (const level of COVERAGE_LEVELS) {
    buckets.set(level, { level, total: 0, known: 0, learning: 0, cells: [] });
  }

  for (const row of rows) {
    const level = jlptLevelToCoverageLevel(row.jlptLevel);
    if (!level) continue;
    const bucket = buckets.get(level)!;
    bucket.total += 1;
    if (row.status === "known") bucket.known += 1;
    else if (row.status) bucket.learning += 1;
    bucket.cells.push({ character: row.character, status: row.status });
  }

  return COVERAGE_LEVELS.map((level) => buckets.get(level)!);
}
