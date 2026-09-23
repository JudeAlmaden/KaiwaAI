/**
 * Data migration: SM-2 → FSRS v4 state for all UserFlashcard and UserKanji records.
 *
 * Usage:
 *   npx tsx scripts/migrate-to-fsrs.ts
 *
 * Idempotent: cards with non-null `difficulty` (already migrated) are skipped.
 * Original SM-2 fields (easeFactor, interval, repetitions) are preserved.
 * Errors on individual cards are logged and do not halt the batch.
 *
 * Validates: Requirements 6.1–6.7
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { createConverter, type CardMetadata } from "../src/lib/fsrs/converter";
import { DEFAULT_FSRS_PARAMETERS } from "../src/lib/fsrs/config";
import type { CardStatus } from "../src/lib/types";

const BATCH_SIZE = 500;

interface MigrationStats {
  flashcards: { total: number; migrated: number; failed: number; skipped: number };
  kanji: { total: number; migrated: number; failed: number; skipped: number };
  errors: Array<{ cardType: string; cardId: string; message: string }>;
  startedAt: Date;
  finishedAt?: Date;
}

function nowISO() {
  return new Date().toISOString();
}

function log(msg: string) {
  console.log(`[${nowISO()}] migrate-to-fsrs | ${msg}`);
}

function logWarn(msg: string) {
  console.warn(`[${nowISO()}] migrate-to-fsrs WARN | ${msg}`);
}

function logError(msg: string) {
  console.error(`[${nowISO()}] migrate-to-fsrs ERROR | ${msg}`);
}

/**
 * Migrate one table (UserFlashcard or UserKanji) in batches.
 */
async function migrateTable<TCard extends {
  id: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  status: string;
  nextReview: Date;
  lastReviewedAt: Date | null;
  timesReviewed: number;
  difficulty: number | null;
}>(
  tableName: "UserFlashcard" | "UserKanji",
  statsKey: "flashcards" | "kanji",
  stats: MigrationStats,
  converter: ReturnType<typeof createConverter>,
  updateFn: (id: string, data: { difficulty: number; stability: number; retrievability: number }) => Promise<void>,
  findManyFn: (skip: number, take: number) => Promise<TCard[]>
) {
  log(`Starting ${tableName} migration (batch size ${BATCH_SIZE})...`);
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const batch = await findManyFn(skip, BATCH_SIZE);
    hasMore = batch.length === BATCH_SIZE;
    skip += batch.length;

    for (const card of batch) {
      stats[statsKey].total++;

      // Idempotency: already migrated if FSRS fields are present
      if (card.difficulty != null) {
        stats[statsKey].skipped++;
        continue;
      }

      try {
        const metadata: CardMetadata = {
          status: card.status as CardStatus,
          nextReview: card.nextReview,
          lastReviewedAt: card.lastReviewedAt,
          timesReviewed: card.timesReviewed,
        };

        const result = converter.convertToFSRS(
          {
            easeFactor: card.easeFactor,
            interval: card.interval,
            repetitions: card.repetitions,
          },
          metadata
        );

        await updateFn(card.id, {
          difficulty: result.difficulty,
          stability: result.stability,
          retrievability: result.retrievability,
        });

        stats[statsKey].migrated++;
      } catch (err) {
        stats[statsKey].failed++;
        const message = err instanceof Error ? err.message : String(err);
        stats.errors.push({
          cardType: tableName,
          cardId: card.id,
          message,
        });
        logError(`${tableName} ${card.id}: ${message}`);
      }
    }

    log(
      `${tableName}: processed ${stats[statsKey].total}, ` +
      `migrated ${stats[statsKey].migrated}, ` +
      `skipped ${stats[statsKey].skipped}, ` +
      `failed ${stats[statsKey].failed}`
    );
  }
}

async function main() {
  const stats: MigrationStats = {
    flashcards: { total: 0, migrated: 0, failed: 0, skipped: 0 },
    kanji: { total: 0, migrated: 0, failed: 0, skipped: 0 },
    errors: [],
    startedAt: new Date(),
  };

  log("=== FSRS v4 data migration starting ===");
  log(`Using ${DEFAULT_FSRS_PARAMETERS.length} FSRS parameters`);

  const converter = createConverter();

  // ── UserFlashcard ────────────────────────────────────────────────────────
  await migrateTable(
    "UserFlashcard",
    "flashcards",
    stats,
    converter,
    async (id, data) => {
      await prisma.userFlashcard.update({ where: { id }, data });
    },
    async (skip, take) => {
      return prisma.userFlashcard.findMany({
        where: { difficulty: null },
        orderBy: { createdAt: "asc" },
        skip,
        take,
      });
    }
  );

  // ── UserKanji ────────────────────────────────────────────────────────────
  await migrateTable(
    "UserKanji",
    "kanji",
    stats,
    converter,
    async (id, data) => {
      await prisma.userKanji.update({ where: { id }, data });
    },
    async (skip, take) => {
      return prisma.userKanji.findMany({
        where: { difficulty: null },
        orderBy: { createdAt: "asc" },
        skip,
        take,
      });
    }
  );

  stats.finishedAt = new Date();
  const durationSec = Math.round(
    (stats.finishedAt.getTime() - stats.startedAt.getTime()) / 1000
  );

  log("=== FSRS v4 data migration complete ===");
  log(`Duration: ${durationSec}s`);
  log(
    `UserFlashcard: total=${stats.flashcards.total}, migrated=${stats.flashcards.migrated}, ` +
    `skipped=${stats.flashcards.skipped}, failed=${stats.flashcards.failed}`
  );
  log(
    `UserKanji: total=${stats.kanji.total}, migrated=${stats.kanji.migrated}, ` +
    `skipped=${stats.kanji.skipped}, failed=${stats.kanji.failed}`
  );

  const totalMigrated = stats.flashcards.migrated + stats.kanji.migrated;
  const totalFailed = stats.flashcards.failed + stats.kanji.failed;
  const total = stats.flashcards.total + stats.kanji.total;
  const successRate = total === 0 ? "100.00" : ((totalMigrated / total) * 100).toFixed(2);

  log(`Summary: ${totalMigrated}/${total} migrated (${successRate}%), ${totalFailed} failures`);

  if (stats.errors.length > 0) {
    logWarn(`Failed card IDs logged; total errors: ${stats.errors.length}`);
    for (const e of stats.errors.slice(0, 50)) {
      logWarn(`  ${e.cardType}:${e.cardId} — ${e.message}`);
    }
    if (stats.errors.length > 50) {
      logWarn(`  ... and ${stats.errors.length - 50} more errors`);
    }
  }
}

main()
  .catch((err) => {
    logError(`Fatal error: ${err instanceof Error ? err.stack || err.message : String(err)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
