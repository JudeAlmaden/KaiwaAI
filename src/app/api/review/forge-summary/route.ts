import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

type MasteryRow = { attempts: number; correct: number; updatedAt: Date };

function summarize(rows: MasteryRow[]) {
  const practiced = rows.filter((row) => row.attempts > 0);
  const attempts = practiced.reduce((total, row) => total + row.attempts, 0);
  const correct = practiced.reduce((total, row) => total + row.correct, 0);
  const lastPracticed = practiced.reduce<Date | null>(
    (latest, row) => (!latest || row.updatedAt > latest ? row.updatedAt : latest),
    null
  );
  return {
    practiced: practiced.length,
    attempts,
    correct,
    accuracy: attempts > 0 ? correct / attempts : null,
    lastPracticed,
  };
}

/** Aggregate progress for the Construction and Fill the blank cards. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [grammar, conjugation] = await Promise.all([
    prisma.grammarMastery.findMany({
      where: { userId: user.id },
      select: { attempts: true, correct: true, updatedAt: true },
    }),
    prisma.conjugationMastery.findMany({
      where: { userId: user.id },
      select: { attempts: true, correct: true, updatedAt: true },
    }),
  ]);

  return NextResponse.json({
    construction: summarize(grammar),
    conjugation: summarize(conjugation),
  });
}
