import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { applyReview, type ReviewGrade } from "@/lib/srs";

import { FlashcardStatus, PartOfSpeech, Prisma } from "@/generated/prisma/client";

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

  // Build base where clause
  const where: Prisma.UserFlashcardWhereInput = { userId: user.id };

  // Apply study mode logic
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

  // Apply additional filters - more complex due to Word/Phrase split
  if (status && ["new", "learning", "known"].includes(status)) {
    where.status = status as FlashcardStatus;
  }

  // Part of speech and JLPT filters need to check both word and phrase
  if (pos || jlpt) {
    const wordFilter: Prisma.WordWhereInput = {};
    const phraseFilter: Prisma.PhraseWhereInput = {};

    if (pos) {
      const posEnum = pos as PartOfSpeech;
      wordFilter.partOfSpeech = { equals: posEnum };
      phraseFilter.partOfSpeech = { equals: posEnum };
    }
    if (jlpt && ["N5", "N4", "N3", "N2", "N1"].includes(jlpt)) {
      wordFilter.jlptLevel = { equals: jlpt };
    }

    const orFilters: Prisma.UserFlashcardWhereInput[] = [];
    if (Object.keys(wordFilter).length > 0) {
      orFilters.push({ word: { is: wordFilter } });
    }
    if (Object.keys(phraseFilter).length > 0) {
      orFilters.push({ phrase: { is: phraseFilter } });
    }
    if (orFilters.length > 0) {
      where.OR = orFilters;
    }
  }

  // Determine sort order based on study mode.
  // For review queues, oldest items are surfaced first and SRS timing is used as the next tie-breaker.
  const orderBy =
    studyMode === "struggling"
      ? [{ easeFactor: "asc" as const }, { createdAt: "asc" as const }]
      : studyMode === "leeches"
        ? [{ timesReviewed: "desc" as const }, { createdAt: "asc" as const }]
        : [{ createdAt: "asc" as const }, { nextReview: "asc" as const }];

  const cards = await prisma.userFlashcard.findMany({
    where,
    include: {
      word: true,
      wordForm: true,
      phrase: true,
    },
    orderBy,
    take: limit,
  });

  // Format cards for compatibility with existing frontend
  const formattedCards = cards.map((card) => {
    let word: string;
    let reading: string;
    let meaning: string;
    let partOfSpeech: string;
    let jlptTier: string | null = null;

    if (card.phrase) {
      word = card.phrase.text;
      reading = card.phrase.reading;
      try {
        const meanings = JSON.parse(card.phrase.meanings);
        meaning = meanings.join("; ");
      } catch {
        meaning = card.phrase.meanings;
      }
      partOfSpeech = card.phrase.partOfSpeech;
    } else if (card.word) {
      word = card.wordForm?.form || card.word.dictionary;
      reading = card.wordForm?.reading || card.word.reading;
      try {
        const meanings = JSON.parse(card.word.meanings);
        meaning = meanings.join("; ");
      } catch {
        meaning = card.word.meanings;
      }
      partOfSpeech = card.word.partOfSpeech;
      jlptTier = card.word.jlptLevel;
    } else {
      word = "Unknown";
      reading = "Unknown";
      meaning = "Unknown";
      partOfSpeech = "unknown";
    }

    return {
      id: card.id,
      word,
      reading,
      meaning,
      partOfSpeech,
      formType: card.wordForm?.formType ?? null,
      dictionary: card.word?.dictionary ?? null,
      jlptTier,
      note: card.note,
      status: card.status,
      easeFactor: card.easeFactor,
      interval: card.interval,
      repetitions: card.repetitions,
      timesReviewed: card.timesReviewed,
      exposures: card.exposures,
      nextReview: card.nextReview,
      lastReviewedAt: card.lastReviewedAt,
      createdAt: card.createdAt,
    };
  });

  return NextResponse.json({ cards: formattedCards });
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

  const card = await prisma.userFlashcard.findFirst({
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

  const updated = await prisma.userFlashcard.update({
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
