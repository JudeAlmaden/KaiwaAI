import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

// Fetch mixed cards (vocabulary + kanji) for review
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const studyMode = sp.get("studyMode") ?? "due";
  const limit = Math.min(Math.max(Number(sp.get("limit")) || 50, 1), 200);

  // Build where clauses for both vocab and kanji
  const vocabWhere: {
    userId: string;
    nextReview?: { lte: Date };
    createdAt?: { gte: Date };
    easeFactor?: { lt: number };
    AND?: Array<{
      timesReviewed?: { gte: number };
      interval?: { lt: number };
    }>;
  } = { userId: user.id };

  const kanjiWhere: typeof vocabWhere = { userId: user.id };

  if (studyMode === "due") {
    vocabWhere.nextReview = { lte: new Date() };
    kanjiWhere.nextReview = { lte: new Date() };
  } else if (studyMode === "recent") {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    vocabWhere.createdAt = { gte: sevenDaysAgo };
    kanjiWhere.createdAt = { gte: sevenDaysAgo };
  } else if (studyMode === "struggling") {
    vocabWhere.easeFactor = { lt: 2.0 };
    kanjiWhere.easeFactor = { lt: 2.0 };
  } else if (studyMode === "leeches") {
    vocabWhere.AND = [
      { timesReviewed: { gte: 8 } },
      { interval: { lt: 7 } }
    ];
    kanjiWhere.AND = [
      { timesReviewed: { gte: 8 } },
      { interval: { lt: 7 } }
    ];
  }

  // Determine sort order
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

  // Fetch vocabulary cards
  const vocabCards = await prisma.userFlashcard.findMany({
    where: vocabWhere,
    include: {
      word: true,
      wordForm: true,
      phrase: true,
    },
    orderBy,
    take: Math.ceil(limit / 2), // Aim for roughly 50/50 split
  });

  // Fetch kanji cards
  const userKanji = await prisma.userKanji.findMany({
    where: kanjiWhere,
    include: {
      kanji: true,
    },
    orderBy,
    take: Math.ceil(limit / 2), // Aim for roughly 50/50 split
  });

  // Transform vocabulary cards
  const vocabTransformed = vocabCards.map((card) => {
    let word: string;
    let reading: string;
    let meaning: string;
    let partOfSpeech: string;

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
    } else {
      word = "Unknown";
      reading = "Unknown";
      meaning = "Unknown";
      partOfSpeech = "unknown";
    }

    return {
      id: card.id,
      type: "vocabulary" as const,
      word,
      reading,
      romaji: reading, // We don't store romaji separately anymore
      meaning,
      partOfSpeech,
      status: card.status,
    };
  });

  // Transform kanji cards
  const kanjiTransformed = userKanji.map((uk) => ({
    id: uk.id,
    type: "kanji" as const,
    character: uk.kanji.character,
    meanings: JSON.parse(uk.kanji.meanings),
    readingsOn: JSON.parse(uk.kanji.readingsOn),
    readingsKun: JSON.parse(uk.kanji.readingsKun),
    mnemonic: uk.mnemonic,
    status: uk.status,
  }));

  // Combine and shuffle
  const allCards = [...vocabTransformed, ...kanjiTransformed];
  // Fisher-Yates shuffle
  for (let i = allCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
  }

  // Limit to requested amount
  const cards = allCards.slice(0, limit);

  return NextResponse.json({ cards });
}
