/**
 * Repairs cards whose interval ran away (100+ years out), which silently retires
 * them from review forever. Dry-run by default; pass --apply to write.
 *
 *   npx tsx scripts/fix-runaway-intervals.ts
 *   npx tsx scripts/fix-runaway-intervals.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { MAX_INTERVAL_DAYS } from "../src/lib/review/lifecycle";

const apply = process.argv.includes("--apply");
const DAY_MS = 24 * 60 * 60 * 1000;

/** Fallback interval derived from review count when stability is unusable. */
function intervalFromRepetitions(repetitions: number): number {
  const reps = Math.max(0, repetitions);
  if (reps === 0) return 1;
  if (reps === 1) return 1;
  if (reps === 2) return 6;
  // 21 days at 3 reps, growing ~1.5x per extra successful review.
  return Math.min(MAX_INTERVAL_DAYS, Math.round(21 * Math.pow(1.5, reps - 3)));
}

function repairedInterval(card: {
  repetitions: number;
  stability: number | null;
  interval: number;
}): number {
  const stability = card.stability;
  if (stability != null && Number.isFinite(stability) && stability >= 1 && stability <= MAX_INTERVAL_DAYS) {
    return Math.round(stability);
  }
  return intervalFromRepetitions(card.repetitions);
}

async function main() {
  const runaway = await prisma.userFlashcard.findMany({
    where: { interval: { gt: MAX_INTERVAL_DAYS } },
    select: {
      id: true,
      userId: true,
      repetitions: true,
      interval: true,
      stability: true,
      lastReviewedAt: true,
    },
  });

  console.log(`vocab cards above ${MAX_INTERVAL_DAYS} days: ${runaway.length}`);
  const plans = runaway.map((card) => {
    const interval = repairedInterval(card);
    // Schedule from the last review when known; fall back to now.
    const base = card.lastReviewedAt ?? new Date();
    return {
      ...card,
      newInterval: interval,
      nextReview: new Date(base.getTime() + interval * DAY_MS),
    };
  });

  console.log("worst offenders:");
  for (const p of plans.sort((a, b) => b.interval - a.interval).slice(0, 5)) {
    console.log(
      `  reps=${p.repetitions} interval=${p.interval}d -> ${p.newInterval}d`
    );
  }

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to write these changes.");
    return;
  }

  let updated = 0;
  for (const p of plans) {
    await prisma.userFlashcard.update({
      where: { id: p.id },
      data: { interval: p.newInterval, nextReview: p.nextReview },
    });
    updated++;
  }
  console.log(`\nUpdated ${updated} cards.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
