import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { applyReview, type ReviewGrade } from "@/lib/srs";

// Cards for review with various study modes:
//   ?studyMode=due         — cards with nextReview in the past (default)
//   ?studyMode=all         — any cards (study ahead)
//   ?studyMode=recent      — cards added in the last 7 days
//   ?studyMode=struggling  — cards with low ease factor (<2.0) or many reviews
//   ?studyMode=leeches     — cards reviewed 8+ times but interval still <7 days
//   ?status=learning       — restrict to a status
//   ?pos=verb              — restrict to a part of speech
//   ?jlpt=N5               — restrict to JLPT level
//   ?limit=20              — cap the session size
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const studyMode = sp.get("studyMode") ?? "due";
  const status = sp.get("status");
  const pos = sp.get("pos");
  const jlpt = sp.get("jlpt");
  const limit = Math.min(Math.max(Number(sp.get("limit")) || 50, 1), 200);

  const where: {
    userId: string;
    nextReview?: { lte: Date } | { gte: Date };
    createdAt?: { gte: Date };
    status?: string;
    partOfSpeech?: string;
    jlptTier?: string;
    easeFactor?: { lt: number };
    timesReviewed?: { gte: number };
    AND?: Array<{
      timesReviewed?: { gte: number };
      interval?: { lt: number };
    }>;
  } = { userId: user.id };

  // Apply study mode logic
  if (studyMode === "due") {
    where.nextReview = { lte: new Date() };
  } else if (studyMode === "recent") {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    where.createdAt = { gte: sevenDaysAgo };
  } else if (studyMode === "struggling") {
    // Cards with low ease factor OR many reviews
    where.easeFactor = { lt: 2.0 };
  } else if (studyMode === "leeches") {
    // Cards reviewed many times but still short interval (not sticking)
    where.AND = [
      { timesReviewed: { gte: 8 } },
      { interval: { lt: 7 } }
    ];
  }
  // "all" mode has no filters on nextReview/createdAt

  // Apply additional filters
  if (status && ["new", "learning", "known"].includes(status)) where.status = status;
  if (pos) where.partOfSpeech = pos;
  if (jlpt && ["N5", "N4", "N3", "N2", "N1"].includes(jlpt)) where.jlptTier = jlpt;

  // Determine sort order based on study mode
  let orderBy: 
    | { nextReview: "asc" }
    | { createdAt: "desc" }
    | { easeFactor: "asc" }
    | { timesReviewed: "desc" } = { nextReview: "asc" };
  if (studyMode === "all" || studyMode === "recent") {
    orderBy = { createdAt: "desc" };
  } else if (studyMode === "struggling") {
    orderBy = { easeFactor: "asc" };
  } else if (studyMode === "leeches") {
    orderBy = { timesReviewed: "desc" };
  }

  const cards = await prisma.flashcard.findMany({
    where,
    orderBy,
    take: limit,
  });

  return NextResponse.json({ cards });
}

// Grade a card and reschedule it via SM-2.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { cardId?: string; grade?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.cardId || body.grade === undefined || body.grade < 0 || body.grade > 3) {
    return NextResponse.json({ error: "Missing cardId or grade." }, { status: 400 });
  }

  const card = await prisma.flashcard.findFirst({
    where: { id: body.cardId, userId: user.id },
  });
  if (!card) return NextResponse.json({ error: "Card not found." }, { status: 404 });

  const result = applyReview(
    {
      easeFactor: card.easeFactor,
      interval: card.interval,
      repetitions: card.repetitions,
    },
    body.grade as ReviewGrade
  );

  const updated = await prisma.flashcard.update({
    where: { id: card.id },
    data: {
      easeFactor: result.easeFactor,
      interval: result.interval,
      repetitions: result.repetitions,
      status: result.status,
      nextReview: result.nextReview,
      timesReviewed: { increment: 1 },
      lastReviewedAt: new Date(),
    },
  });

  return NextResponse.json({ card: updated });
}
