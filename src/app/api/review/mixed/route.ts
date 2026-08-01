import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { composeSession } from "@/lib/session-composer";

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

  // Use session composition for standard review modes
  const useSessionComposition = studyMode === "due" || studyMode === "all" || studyMode === "recent";

  let vocabCards, userKanji;

  if (useSessionComposition) {
    // Fetch larger pools with deterministic ordering
    const fetchLimit = Math.ceil(limit * 2); // Each type gets 2x for pool composition
    
    const allVocab = await prisma.userFlashcard.findMany({
      where: vocabWhere,
      include: {
        word: true,
        wordForm: true,
        phrase: true,
      },
      orderBy: [
        { easeFactor: "asc" },
        { repetitions: "asc" },
        { createdAt: "asc" },
      ],
      take: fetchLimit,
    });

    const allKanji = await prisma.userKanji.findMany({
      where: kanjiWhere,
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

    // Compose sessions for each type (split limit roughly 50/50)
    const vocabSession = composeSession(allVocab, Math.ceil(limit / 2));
    const kanjiSession = composeSession(allKanji, Math.ceil(limit / 2));

    vocabCards = vocabSession.session;
    userKanji = kanjiSession.session;
  } else {
    // Legacy behavior for struggling/leeches modes
    const orderBy =
      studyMode === "struggling"
        ? [{ easeFactor: "asc" as const }, { createdAt: "asc" as const }]
        : studyMode === "leeches"
          ? [{ timesReviewed: "desc" as const }, { createdAt: "asc" as const }]
          : [{ createdAt: "asc" as const }, { nextReview: "asc" as const }];

    vocabCards = await prisma.userFlashcard.findMany({
      where: vocabWhere,
      include: {
        word: true,
        wordForm: true,
        phrase: true,
      },
      orderBy,
      take: Math.ceil(limit / 2),
    });

    userKanji = await prisma.userKanji.findMany({
      where: kanjiWhere,
      include: {
        kanji: true,
      },
      orderBy,
      take: Math.ceil(limit / 2),
    });
  }

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
