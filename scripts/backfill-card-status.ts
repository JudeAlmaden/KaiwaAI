/**
 * Recomputes the stored `status` column from the single lifecycle rule
 * (review/lifecycle.ts). Dry-run by default; pass --apply to write.
 *
 *   npx tsx scripts/backfill-card-status.ts
 *   npx tsx scripts/backfill-card-status.ts --apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { cardStatus } from "../src/lib/review/lifecycle";

const apply = process.argv.includes("--apply");

async function main() {
  const [flashcards, kanji] = await Promise.all([
    prisma.userFlashcard.findMany({
      select: { id: true, status: true, repetitions: true, interval: true },
    }),
    prisma.userKanji.findMany({
      select: { id: true, status: true, repetitions: true, interval: true },
    }),
  ]);

  // Cards already labelled "new" keep that label: it is a valid stored status and
  // some queries filter on it deliberately.
  const shouldRelabel = (c: { status: string; repetitions: number; interval: number }) =>
    c.status !== "new" &&
    c.status !== cardStatus({ repetitions: c.repetitions, interval: c.interval });

  const vocabChanges = flashcards.filter(shouldRelabel);
  const kanjiChanges = kanji.filter(shouldRelabel);

  const tally = (rows: { status: string; repetitions: number; interval: number }[]) => {
    const counts: Record<string, number> = {};
    for (const row of rows) {
      const next = cardStatus({ repetitions: row.repetitions, interval: row.interval });
      counts[`${row.status} -> ${next}`] = (counts[`${row.status} -> ${next}`] ?? 0) + 1;
    }
    return counts;
  };

  console.log(`vocab: ${flashcards.length} cards, ${vocabChanges.length} to relabel`);
  console.log(tally(vocabChanges));
  console.log(`kanji: ${kanji.length} cards, ${kanjiChanges.length} to relabel`);
  console.log(tally(kanjiChanges));

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to write these changes.");
    return;
  }

  for (const card of vocabChanges) {
    await prisma.userFlashcard.update({
      where: { id: card.id },
      data: { status: cardStatus({ repetitions: card.repetitions, interval: card.interval }) },
    });
  }
  for (const card of kanjiChanges) {
    await prisma.userKanji.update({
      where: { id: card.id },
      data: { status: cardStatus({ repetitions: card.repetitions, interval: card.interval }) },
    });
  }
  console.log(
    `\nUpdated ${vocabChanges.length} vocab and ${kanjiChanges.length} kanji cards.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
