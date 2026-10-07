import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { composeSession } from "@/lib/session-composer";

function safeJsonArray(val: string | null | undefined): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

// Fetch mixed cards (vocabulary + kanji) for review
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const studyMode = sp.get("studyMode") ?? "due";
  const limit = Math.min(Math.max(Number(sp.get("limit")) || 50, 1), 200);
  const rawRatio = sp.get("learningRatio");
  const learningRatio = rawRatio !== null && !isNaN(parseFloat(rawRatio)) ? parseFloat(rawRatio) : 0.5;

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

  // Use session composition for all standard review modes
  // studyMode=all uses session composition with ignoreDueDate=true
  const useSessionComposition = 
    studyMode === "due" || studyMode === "recent" || studyMode === "all";
  const ignoreDueDate = studyMode === "all";

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

    // Split limit 50/50 but allow backfill: if one type has fewer cards, donate
    // unused slots to the other so the session reaches the requested limit.
    const halfLimit = Math.ceil(limit / 2);
    const vocabSession = composeSession(allVocab, halfLimit, ignoreDueDate, learningRatio);
    const kanjiSession = composeSession(allKanji, halfLimit, ignoreDueDate, learningRatio);

    const vocabActual = vocabSession.session.length;
    const kanjiActual = kanjiSession.session.length;

    // Backfill: if vocab came up short, ask kanji to fill the gap (and vice-versa)
    const vocabShortfall = halfLimit - vocabActual;
    const kanjiShortfall = halfLimit - kanjiActual;
    let vocabFinal = vocabSession.session;
    let kanjiFinal = kanjiSession.session;
    let vocabMaintenanceCards = vocabSession.maintenanceCards;
    let kanjiMaintenanceCards = kanjiSession.maintenanceCards;

    if (vocabShortfall > 0 && kanjiShortfall <= 0) {
      // Kanji has surplus; pull extra from it
      const extraKanji = composeSession(allKanji, halfLimit + vocabShortfall, ignoreDueDate, learningRatio);
      kanjiFinal = extraKanji.session;
      kanjiMaintenanceCards = extraKanji.maintenanceCards;
    } else if (kanjiShortfall > 0 && vocabShortfall <= 0) {
      // Vocab has surplus; pull extra from it
      const extraVocab = composeSession(allVocab, halfLimit + kanjiShortfall, ignoreDueDate, learningRatio);
      vocabFinal = extraVocab.session;
      vocabMaintenanceCards = extraVocab.maintenanceCards;
    }

    const vocabMaintenanceIds = new Set(vocabMaintenanceCards.map((c) => c.id));
    const kanjiMaintenanceIds = new Set(kanjiMaintenanceCards.map((c) => c.id));

    vocabCards = vocabFinal.map((c) => ({ ...c, _isMaintenance: vocabMaintenanceIds.has(c.id) }));
    userKanji = kanjiFinal.map((c) => ({ ...c, _isMaintenance: kanjiMaintenanceIds.has(c.id) }));
  } else {
    // Legacy behavior for struggling/leeches modes
    // Fetch up to `limit` from each type so we can backfill if one pool is sparse.
    const orderBy =
      studyMode === "struggling"
        ? [{ easeFactor: "asc" as const }, { createdAt: "asc" as const }]
        : studyMode === "leeches"
          ? [{ timesReviewed: "desc" as const }, { createdAt: "asc" as const }]
          : [{ createdAt: "asc" as const }, { nextReview: "asc" as const }];

    const halfLimit = Math.ceil(limit / 2);

    const vocabRaw = await prisma.userFlashcard.findMany({
      where: vocabWhere,
      include: {
        word: true,
        wordForm: true,
        phrase: true,
      },
      orderBy,
      take: limit, // fetch full limit so backfill is possible
    });

    const kanjiRaw = await prisma.userKanji.findMany({
      where: kanjiWhere,
      include: {
        kanji: true,
      },
      orderBy,
      take: limit, // fetch full limit so backfill is possible
    });

    // Backfill: whichever type has surplus fills the gap left by the sparse type
    const vocabTarget = Math.min(halfLimit + Math.max(0, halfLimit - kanjiRaw.length), vocabRaw.length);
    const kanjiTarget = Math.min(limit - vocabTarget, kanjiRaw.length);

    vocabCards = vocabRaw.slice(0, vocabTarget);
    userKanji = kanjiRaw.slice(0, kanjiTarget);
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
      _pool: (card as typeof card & { _isMaintenance?: boolean })._isMaintenance ? ("maintenance" as const) : ("active" as const),
    };
  });

  // Transform kanji cards
  const kanjiTransformed = userKanji.map((uk) => {
    const rawMeanings = safeJsonArray(uk.kanji.meanings);
    const meanings = uk.customMeaning
      ? [uk.customMeaning, ...rawMeanings.filter((m) => m !== uk.customMeaning)]
      : rawMeanings;

    const readingsOn = safeJsonArray(uk.kanji.readingsOn);
    const readingsKun = safeJsonArray(uk.kanji.readingsKun);
    const radicals = safeJsonArray(uk.kanji.radicals);
    const primitives = safeJsonArray(uk.kanji.primitives);

    return {
      id: uk.id,
      type: "kanji" as const,
      character: uk.kanji.character,
      meanings,
      readingsOn,
      readingsKun,
      radicals,
      primitives,
      heisigNumber: uk.kanji.heisigNumber,
      heisigKeyword: uk.kanji.heisigKeyword,
      heisigLesson: uk.kanji.heisigLesson,
      customMeaning: uk.customMeaning,
      mnemonic: uk.mnemonic,
      status: uk.status,
      _pool: (uk as typeof uk & { _isMaintenance?: boolean })._isMaintenance ? ("maintenance" as const) : ("active" as const),
    };
  });

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
