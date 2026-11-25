import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import {
  applyAttempt,
  dimensionForStage,
  withDimensionAttempt,
  type PracticeStage,
} from "@/lib/review/conjugation-mastery";

/** Every conjugation pattern this user has practiced, weakest due first. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mastery = await prisma.conjugationMastery.findMany({
    where: { userId: user.id },
    orderBy: { dueAt: "asc" },
  });

  return NextResponse.json({ mastery });
}

/** Record one answer. Stage is derived from these counts, never stored. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { pattern?: unknown; correct?: unknown; stage?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const pattern = typeof body.pattern === "string" ? body.pattern.trim() : "";
  const correct = body.correct;
  if (!pattern || typeof correct !== "boolean") {
    return NextResponse.json({ error: "Missing pattern or correct." }, { status: 400 });
  }

  // Older clients don't send a stage; keep recording their overall counts.
  const stageValue = Number(body.stage);
  const stage: PracticeStage | null =
    stageValue === 1 || stageValue === 2 || stageValue === 3 || stageValue === 4
      ? stageValue
      : null;

  const existing = await prisma.conjugationMastery.findUnique({
    where: { userId_pattern: { userId: user.id, pattern } },
  });
  const next = applyAttempt(existing, correct);
  const counts = stage
    ? withDimensionAttempt(existing, dimensionForStage(stage), correct)
    : {};

  const saved = await prisma.conjugationMastery.upsert({
    where: { userId_pattern: { userId: user.id, pattern } },
    create: {
      userId: user.id,
      pattern,
      attempts: next.attempts,
      correct: next.correct,
      streak: next.streak,
      lastResult: correct,
      dueAt: next.dueAt,
      ...counts,
    },
    update: {
      attempts: next.attempts,
      correct: next.correct,
      streak: next.streak,
      lastResult: correct,
      dueAt: next.dueAt,
      ...counts,
    },
  });

  return NextResponse.json({ mastery: saved });
}
