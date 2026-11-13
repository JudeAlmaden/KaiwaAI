/**
 * Read-only audit of scheduling sanity. Prints anything that looks off so a
 * repair can be justified before running it.
 *
 *   npx tsx scripts/audit-card-timing.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { MAX_INTERVAL_DAYS, cardStatus } from "../src/lib/review/lifecycle";

const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date();

type Row = {
  id: string;
  interval: number;
  repetitions: number;
  status: string;
  nextReview: Date;
  lastReviewedAt: Date | null;
  stability: number | null;
  difficulty: number | null;
};

function inspect(label: string, rows: Row[]) {
  const issues = {
    intervalOverCeiling: [] as Row[],
    intervalNotPositive: [] as Row[],
    nextReviewBeforeLastReview: [] as Row[],
    nextReviewFarBeyondInterval: [] as Row[],
    nextReviewOverCeiling: [] as Row[],
    lastReviewInFuture: [] as Row[],
    statusMismatch: [] as Row[],
    badFsrsState: [] as Row[],
  };

  for (const r of rows) {
    if (r.interval > MAX_INTERVAL_DAYS) issues.intervalOverCeiling.push(r);
    if (r.interval < 0) issues.intervalNotPositive.push(r);
    if (r.lastReviewedAt && r.nextReview < r.lastReviewedAt)
      issues.nextReviewBeforeLastReview.push(r);
    // nextReview may be computed from "now" (repairs) or from the last review,
    // so allow the interval measured from either point.
    const fromLast = (r.lastReviewedAt ?? now).getTime() + (r.interval + 2) * DAY_MS;
    const fromNow = now.getTime() + (r.interval + 2) * DAY_MS;
    if (r.nextReview.getTime() > Math.max(fromLast, fromNow))
      issues.nextReviewFarBeyondInterval.push(r);
    if (r.nextReview.getTime() > now.getTime() + (MAX_INTERVAL_DAYS + 1) * DAY_MS)
      issues.nextReviewOverCeiling.push(r);
    if (r.lastReviewedAt && r.lastReviewedAt > now) issues.lastReviewInFuture.push(r);
    if (r.status !== "new" && r.status !== cardStatus(r)) issues.statusMismatch.push(r);
    if (r.stability != null && (!Number.isFinite(r.stability) || r.stability <= 0))
      issues.badFsrsState.push(r);
    if (r.difficulty != null && (!Number.isFinite(r.difficulty) || r.difficulty <= 0))
      issues.badFsrsState.push(r);
  }

  console.log(`\n=== ${label} (${rows.length} cards) ===`);
  for (const [key, list] of Object.entries(issues)) {
    console.log(`  ${key.padEnd(30)} ${list.length}`);
  }
  const worst = [...issues.intervalOverCeiling]
    .sort((a, b) => b.interval - a.interval)
    .slice(0, 3);
  if (worst.length) {
    console.log(
      "  worst intervals:",
      worst.map((c) => `${c.interval}d (reps ${c.repetitions})`).join(", ")
    );
  }
  return issues;
}

async function main() {
  const [vocab, kanji] = await Promise.all([
    prisma.userFlashcard.findMany({
      select: {
        id: true,
        interval: true,
        repetitions: true,
        status: true,
        nextReview: true,
        lastReviewedAt: true,
        stability: true,
        difficulty: true,
      },
    }),
    prisma.userKanji.findMany({
      select: {
        id: true,
        interval: true,
        repetitions: true,
        status: true,
        nextReview: true,
        lastReviewedAt: true,
        stability: true,
        difficulty: true,
      },
    }),
  ]);

  const v = inspect("vocab", vocab);
  const k = inspect("kanji", kanji);

  const totalIssues = (i: Record<string, Row[]>) =>
    Object.entries(i)
      .filter(([key]) => key !== "statusMismatch")
      .reduce((sum, [, list]) => sum + list.length, 0);

  console.log(
    `\ntiming problems: vocab ${totalIssues(v)}, kanji ${totalIssues(k)}`
  );
  console.log(
    `status mismatches (expected until backfill runs): vocab ${v.statusMismatch.length}, kanji ${k.statusMismatch.length}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
