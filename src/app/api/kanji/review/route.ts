import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { applyReview, type ReviewGrade } from "@/lib/srs";
import { composeSession } from "@/lib/session-composer";

// Fetch kanji for review with study modes
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const studyMode = sp.get("studyMode") ?? "due";
  const limit = Math.min(Math.max(Number(sp.get("limit")) || 50, 1), 200);

  // Get user's kanji learning records
  const where: {
    userId: string;
    nextReview?: { lte: Date };
    createdAt?: { gte: Date };
    easeFactor?: { lt: number };
    AND?: Array<{
      timesReviewed?: { gte: number };
      interval?: { lt: number };
    }>;
  } = { userId: user.id };

  if (studyMode === "due") {
    where.nextReview = { lte: new Date() };
  } else if (studyMode === "recent") {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    where.createdAt = { gte: sevenDaysAgo };
  } else if (studyMode === "struggling") {
    where.easeFactor = { lt: 2.0 };
  } else if (studyMode === "leeches") {
    where.AND = [
      { timesReviewed: { gte: 8 } },
      { interval: { lt: 7 } }
    ];
  }

  // Use session composition for all standard review modes
  // studyMode=all uses session composition with ignoreDueDate=true
  const useSessionComposition = 
    studyMode === "due" || studyMode === "recent" || studyMode === "all";
  const ignoreDueDate = studyMode === "all";

  let userKanji;

  if (useSessionComposition) {
    // Fetch larger pool with deterministic ordering
    const fetchLimit = Math.min(limit * 4, 200);
    
    const allKanji = await prisma.userKanji.findMany({
      where,
      include: {
        kanji: true,
      },
      orderBy: [
        { easeFactor: "asc" },
        { repetitions: "asc" },
        { createdAt: "asc" },
      ],
      take: fetchLimit,
    });

    // Compose session: 50% active, 50% maintenance
    // For studyMode=all, ignoreDueDate allows maintenance pool to include all cards
    const { session } = composeSession(allKanji, limit, ignoreDueDate);
    userKanji = session;
  } else {
    // Legacy behavior for struggling/leeches/all modes
    const orderBy =
      studyMode === "struggling"
        ? [{ easeFactor: "asc" as const }, { createdAt: "asc" as const }]
        : studyMode === "leeches"
          ? [{ timesReviewed: "desc" as const }, { createdAt: "asc" as const }]
          : [{ createdAt: "asc" as const }, { nextReview: "asc" as const }];

    userKanji = await prisma.userKanji.findMany({
      where,
      include: {
        kanji: true,
      },
      orderBy,
      take: limit,
    });
  }

  // Transform to card format
  const cards = userKanji.map((uk) => ({
    id: uk.id,
    character: uk.kanji.character,
    meanings: JSON.parse(uk.kanji.meanings),
    readingsOn: JSON.parse(uk.kanji.readingsOn),
    readingsKun: JSON.parse(uk.kanji.readingsKun),
    radicals: JSON.parse(uk.kanji.radicals),
    mnemonic: uk.mnemonic, // User's custom mnemonic
    status: uk.status,
  }));

  return NextResponse.json({ cards });
}

// Grade a kanji card
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { cardId?: string; grade?: number; earlyReviewStrategy?: 'practice' | 'proportional' };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.cardId || body.grade === undefined || body.grade < 0 || body.grade > 3) {
    return NextResponse.json({ error: "Missing cardId or grade." }, { status: 400 });
  }

  const userKanji = await prisma.userKanji.findFirst({
    where: { id: body.cardId, userId: user.id },
  });
  if (!userKanji) return NextResponse.json({ error: "Card not found." }, { status: 404 });

  const isEarly = userKanji.nextReview && new Date(userKanji.nextReview) > new Date();

  if (isEarly && body.earlyReviewStrategy === 'practice') {
    // Recommendation A: Treat early reviews as practice - do not update SRS parameters
    const updated = await prisma.userKanji.update({
      where: { id: userKanji.id },
      data: {
        lastReviewedAt: new Date(),
      },
    });
    return NextResponse.json({ card: updated });
  }

  let options = undefined;
  if (isEarly && body.earlyReviewStrategy === 'proportional') {
    // Recommendation B: Proportional scaling based on actual elapsed days
    const lastReviewed = userKanji.lastReviewedAt ? new Date(userKanji.lastReviewedAt) : null;
    const now = new Date();
    const daysElapsed = lastReviewed
      ? Math.max(0, (now.getTime() - lastReviewed.getTime()) / (1000 * 60 * 60 * 24))
      : userKanji.interval;

    options = {
      isEarly: true,
      daysElapsed,
    };
  }

  const result = options
    ? applyReview(
        {
          easeFactor: userKanji.easeFactor,
          interval: userKanji.interval,
          repetitions: userKanji.repetitions,
        },
        body.grade as ReviewGrade,
        options
      )
    : applyReview(
        {
          easeFactor: userKanji.easeFactor,
          interval: userKanji.interval,
          repetitions: userKanji.repetitions,
        },
        body.grade as ReviewGrade
      );

  const updated = await prisma.userKanji.update({
    where: { id: userKanji.id },
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
