import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { buildKanjiCoverage, type CoverageStatus } from "@/lib/kanji-coverage";

// Which JLPT kanji the learner has met, marked known, or never touched.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [kanji, userKanji] = await Promise.all([
    prisma.kanji.findMany({
      where: { jlptLevel: { not: null } },
      select: { character: true, jlptLevel: true },
      // Most common first inside each level, so the wall reads useful → rare.
      orderBy: [{ jlptLevel: "desc" }, { frequency: "asc" }],
    }),
    prisma.userKanji.findMany({
      where: { userId: user.id },
      select: { status: true, kanji: { select: { character: true } } },
    }),
  ]);

  const statusByCharacter = new Map<string, CoverageStatus>();
  for (const row of userKanji) {
    statusByCharacter.set(row.kanji.character, row.status as CoverageStatus);
  }

  const levels = buildKanjiCoverage(
    kanji.map((k) => ({
      character: k.character,
      jlptLevel: k.jlptLevel,
      status: statusByCharacter.get(k.character) ?? null,
    }))
  );

  const totals = levels.reduce(
    (acc, level) => ({
      total: acc.total + level.total,
      known: acc.known + level.known,
      learning: acc.learning + level.learning,
    }),
    { total: 0, known: 0, learning: 0 }
  );

  return NextResponse.json({ levels, totals });
}
