import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import type { ReviewGrade } from "@/lib/srs";
import { composeSession, LOCK_SEEN_COOLDOWN_MS } from "@/lib/session-composer";
import {
  applyFsrsReview,
  buildReviewPersistData,
} from "@/lib/fsrs/apply-review";

import { FlashcardStatus, PartOfSpeech, Prisma } from "@/generated/prisma/client";
import { parseCardSource } from "@/lib/review/card-source";
import {
  mergeUniqueById,
  needsMaintenanceTopUp,
} from "@/lib/review/maintenance-window";
import { LEARNING_CARD_WHERE, STUDIED_CARD_WHERE } from "@/lib/review/lifecycle";
import { LEECH_MAX_INTERVAL_DAYS, LEECH_MIN_LAPSES } from "@/lib/review/leech";
import { DEFAULT_LEARNING_CONFIG } from "@/lib/learning-config";
import { extractKanji } from "@/lib/kanji-utils";
import { loadComponentMap } from "@/lib/kanji-mnemonic/context.server";
import { mergeComponents } from "@/lib/kanji-mnemonic/context";

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
  const rawRatio = sp.get("learningRatio");
  const learningRatio = rawRatio !== null && !isNaN(parseFloat(rawRatio)) ? parseFloat(rawRatio) : 0.5;
  const rawMaxLearning = sp.get("maxLearningPool");
  const rawNewPerSession = sp.get("newPerSession");
  const newPerSession = rawNewPerSession !== null && !isNaN(parseInt(rawNewPerSession, 10)) ? parseInt(rawNewPerSession, 10) : undefined;
  // The blocked-app session asks for a full card count; a normal study session
  // must not quietly pull in new words or study-ahead cards.
  const fillSession = sp.get("fill") === "1" || sp.get("fill") === "true";
  const maxLearningPool = rawMaxLearning !== null && !isNaN(parseInt(rawMaxLearning, 10)) ? parseInt(rawMaxLearning, 10) : undefined;

  // Build base where clause
  const where: Prisma.UserFlashcardWhereInput = { userId: user.id };

  // Reviews only (learningRatio === 0) in due mode: exclude never-studied cards,
  // but keep lapsed ones (repetitions 0 after "Again", timesReviewed > 0).
  if (studyMode === "due" && learningRatio === 0) {
    where.AND = [STUDIED_CARD_WHERE];
  }

  // Apply study mode logic
  if (studyMode === "due") {
    where.nextReview = { lte: new Date() };
  } else if (studyMode === "recent") {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    where.createdAt = { gte: sevenDaysAgo };
  } else if (studyMode === "struggling") {
    // FSRS no longer updates easeFactor, so difficulty is the live signal;
    // cards that predate migration still fall back to their SM-2 ease.
    where.AND = [
      { OR: [{ difficulty: { gt: 7 } }, { difficulty: null, easeFactor: { lt: 2.0 } }] },
    ];
  } else if (studyMode === "leeches") {
    where.AND = [
      { lapses: { gte: LEECH_MIN_LAPSES } },
      { interval: { lt: LEECH_MAX_INTERVAL_DAYS } }
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

  // Use session composition for all standard review modes
  // studyMode=all uses session composition with ignoreDueDate=true
  // Keep legacy sorting only for diagnostic modes (struggling, leeches)
  const useSessionComposition = 
    studyMode === "due" || studyMode === "recent" || studyMode === "all";
  const ignoreDueDate = studyMode === "all";

  let cards;

  if (useSessionComposition) {
    // Fetch larger pool for session composition (4x to ensure enough cards for both pools)
    const fetchLimit = Math.min(limit * 4, 200);
    
    // Fetch with deterministic ordering for active pool prioritization
    let allCards = await prisma.userFlashcard.findMany({
      where,
      include: {
        word: { include: { forms: true } },
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

    // A due pool smaller than the session still has to fill it: the composer
    // carries on with new cards and then studied cards that aren't due yet, so
    // hand it that second pool instead of ending the session short.
    if (fillSession && studyMode === "due" && allCards.length < limit) {
      // A reviews-only pool holds no new cards; the cascade needs them too.
      if (learningRatio === 0) {
        const fresh = await prisma.userFlashcard.findMany({
          where: {
            userId: user.id,
            repetitions: 0,
            timesReviewed: 0,
            nextReview: { lte: new Date() },
          },
          include: {
            word: { include: { forms: true } },
            wordForm: true,
            phrase: true,
          },
          orderBy: [{ createdAt: "asc" }],
          take: fetchLimit,
        });
        allCards = mergeUniqueById(allCards, fresh ?? []);
      }
      const ahead = await prisma.userFlashcard.findMany({
        where: {
          ...where,
          nextReview: { gt: new Date() },
          // Reviews-only already carries the studied filter; don't stack it twice.
          AND: Array.isArray(where.AND) ? where.AND : [STUDIED_CARD_WHERE],
        },
        include: {
          word: { include: { forms: true } },
          wordForm: true,
          phrase: true,
        },
        orderBy: [{ nextReview: "asc" }],
        take: fetchLimit,
      });
      allCards = mergeUniqueById(allCards, ahead ?? []);
    }

    // Weakest-first ordering lets a large new-card backlog fill the entire
    // window, so the maintenance pool never forms. Top it up separately.
    if (learningRatio > 0 && needsMaintenanceTopUp(allCards, limit, learningRatio)) {
      const reviewed = await prisma.userFlashcard.findMany({
        where: {
          ...where,
          AND: [...(Array.isArray(where.AND) ? where.AND : []), STUDIED_CARD_WHERE],
        },
        include: {
          word: { include: { forms: true } },
          wordForm: true,
          phrase: true,
        },
        orderBy: [{ nextReview: "asc" }],
        take: fetchLimit,
      });
      allCards = mergeUniqueById(allCards, reviewed ?? []);
    }

    let effectiveNewPerSession = newPerSession ?? DEFAULT_LEARNING_CONFIG.newPerSession;
    // A blocked-app session still needs something to show: the pool cap gates
    // normal sessions, but a filling session keeps at least one new card.
    if (fillSession) {
      effectiveNewPerSession = Math.max(1, effectiveNewPerSession);
    }
    if (!fillSession && maxLearningPool !== undefined && maxLearningPool > 0) {
      const inLearningCount = await prisma.userFlashcard.count({
        where: { userId: user.id, ...LEARNING_CARD_WHERE },
      });
      if (inLearningCount >= maxLearningPool) {
        effectiveNewPerSession = 0;
      }
    }

    // Compose session: active (focused learning) vs maintenance (retention) based on learningRatio
    // For studyMode=all, ignoreDueDate allows maintenance pool to include all cards
    const { session, maintenanceCards } = composeSession(
      allCards,
      limit,
      ignoreDueDate,
      learningRatio,
      {
        maxNewPerSession: effectiveNewPerSession,
        fillSession,
        seenCooldownMs: fillSession ? LOCK_SEEN_COOLDOWN_MS : undefined,
      }
    );
    const maintenanceIds = new Set(maintenanceCards.map((c) => c.id));
    cards = session.map((c) => ({ ...c, _isMaintenance: maintenanceIds.has(c.id) }));
  } else {
    // Legacy behavior for struggling/leeches/all modes
    const orderBy =
      studyMode === "struggling"
        ? [{ easeFactor: "asc" as const }, { createdAt: "asc" as const }]
        : studyMode === "leeches"
          ? [{ timesReviewed: "desc" as const }, { createdAt: "asc" as const }]
          : [{ createdAt: "asc" as const }, { nextReview: "asc" as const }];

    cards = await prisma.userFlashcard.findMany({
      where,
      include: {
        word: { include: { forms: true } },
        wordForm: true,
        phrase: true,
      },
      orderBy,
      take: limit,
    });
  }

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
      reading = card.wordForm?.reading || card.readingOverride || card.word.reading;
      try {
        const meanings = JSON.parse(card.word.meanings);
        meaning = meanings.join("; ");
      } catch {
        meaning = card.word.meanings;
      }
      if (card.meaningOverride) meaning = card.meaningOverride;
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
      verbType: card.word?.verbType ?? null,
      adjectiveType: card.word?.adjectiveType ?? null,
      forms:
        card.word?.forms?.map((form) => ({
          form: form.form,
          reading: form.reading,
          formType: form.formType,
        })) ?? [],
      formType: card.wordForm?.formType ?? null,
      dictionary: card.word?.dictionary ?? null,
      jlptTier,
      note: card.note,
      // The chat exchange that introduced this word, when we know it.
      sourceContext: parseCardSource(card.sourceContext),
      status: card.status,
      easeFactor: card.easeFactor,
      interval: card.interval,
      repetitions: card.repetitions,
      timesReviewed: card.timesReviewed,
      lapses: card.lapses,
      exposures: card.exposures,
      nextReview: card.nextReview,
      lastReviewedAt: card.lastReviewedAt,
      createdAt: card.createdAt,
      _pool: (card as typeof card & { _isMaintenance?: boolean })._isMaintenance ? ("maintenance" as const) : ("active" as const),
    };
  });

  // One batched lookup for every kanji in the page's words, so the word hint
  // can build on keywords the learner already studied.
  const wordComponentMap = await loadComponentMap(
    user.id,
    formattedCards.flatMap((card) => extractKanji(card.word))
  );

  return NextResponse.json({
    cards: formattedCards.map((card) => ({
      ...card,
      wordKanji: mergeComponents(extractKanji(card.word), wordComponentMap),
    })),
  });
}

// Grade a card and reschedule it via FSRS v4 (SM-2 fallback on error).
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    cardId?: string;
    grade?: number;
    desiredRetention?: number;
    /** Sent by the blocked-app screen; grade 0 there must not count as a lapse. */
    fromLock?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const grade = Number(body.grade);
  if (!body.cardId || body.grade === undefined || !Number.isInteger(grade) || grade < 0 || grade > 3) {
    return NextResponse.json({ error: "Missing cardId or grade." }, { status: 400 });
  }

  const card = await prisma.userFlashcard.findFirst({
    where: { id: body.cardId, userId: user.id },
  });
  if (!card) return NextResponse.json({ error: "Card not found." }, { status: 404 });

  const fsrsResult = applyFsrsReview({
    card: {
      id: card.id,
      userId: card.userId,
      easeFactor: card.easeFactor,
      interval: card.interval,
      repetitions: card.repetitions,
      status: card.status,
      nextReview: card.nextReview,
      lastReviewedAt: card.lastReviewedAt,
      firstLearnedAt: card.firstLearnedAt,
      timesReviewed: card.timesReviewed,
      difficulty: card.difficulty,
      stability: card.stability,
      retrievability: card.retrievability,
    },
    grade: grade as ReviewGrade,
    cardType: "flashcard",
    desiredRetention: body.desiredRetention,
    suppressLapse: body.fromLock === true,
  });

  const persist = buildReviewPersistData(fsrsResult);

  const updated = await prisma.userFlashcard.update({
    where: { id: card.id },
    data: persist,
  });

  return NextResponse.json({ card: updated });
}
