import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { applyReview, type ReviewGrade } from "@/lib/srs";

// Cards due for review (default), or a custom session via query params:
//   ?mode=due           — cards with nextReview in the past (default)
//   ?mode=all           — any cards (study ahead)
//   ?status=learning    — restrict to a status
//   ?pos=verb           — restrict to a part of speech
//   ?limit=20           — cap the session size
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const mode = sp.get("mode") ?? "due";
  const status = sp.get("status");
  const pos = sp.get("pos");
  const limit = Math.min(Math.max(Number(sp.get("limit")) || 50, 1), 200);

  const where: {
    userId: string;
    nextReview?: { lte: Date };
    status?: string;
    partOfSpeech?: string;
  } = { userId: user.id };

  if (mode === "due") where.nextReview = { lte: new Date() };
  if (status && ["new", "learning", "known"].includes(status)) where.status = status;
  if (pos) where.partOfSpeech = pos;

  const cards = await prisma.flashcard.findMany({
    where,
    orderBy: mode === "due" ? { nextReview: "asc" } : { createdAt: "desc" },
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
