import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { applyAttempt } from "@/lib/grammar/mastery";
import { CONCEPT_BY_ID } from "@/lib/grammar/curriculum";

/** Every grammar concept this user has practiced. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mastery = await prisma.grammarMastery.findMany({
    where: { userId: user.id },
    orderBy: { dueAt: "asc" },
  });

  return NextResponse.json({ mastery });
}

/** Record one answer. Stage is derived from these counts, never stored. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { concept?: unknown; correct?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const concept = typeof body.concept === "string" ? body.concept.trim() : "";
  const correct = body.correct;
  if (!concept || typeof correct !== "boolean") {
    return NextResponse.json({ error: "Missing concept or correct." }, { status: 400 });
  }
  if (!CONCEPT_BY_ID.has(concept)) {
    return NextResponse.json({ error: "Unknown concept." }, { status: 400 });
  }

  const existing = await prisma.grammarMastery.findUnique({
    where: { userId_concept: { userId: user.id, concept } },
  });
  const next = applyAttempt(existing, correct);

  const saved = await prisma.grammarMastery.upsert({
    where: { userId_concept: { userId: user.id, concept } },
    create: {
      userId: user.id,
      concept,
      attempts: next.attempts,
      correct: next.correct,
      streak: next.streak,
      lastResult: correct,
      dueAt: next.dueAt,
    },
    update: {
      attempts: next.attempts,
      correct: next.correct,
      streak: next.streak,
      lastResult: correct,
      dueAt: next.dueAt,
    },
  });

  return NextResponse.json({ mastery: saved });
}
