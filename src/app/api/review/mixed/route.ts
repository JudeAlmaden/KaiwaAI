import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import type { Prisma } from "@/generated/prisma/client";
import { composeSession } from "@/lib/session-composer";
import { parseCardSource } from "@/lib/review/card-source";
import {
  mergeUniqueById,
  needsMaintenanceTopUp,
} from "@/lib/review/maintenance-window";
import { LEARNING_CARD_WHERE, STUDIED_CARD_WHERE, isNewCard } from "@/lib/review/lifecycle";
import {
  introducedTodayWhere,
  isLearningPoolFull,
  resolveNewAllowance,
  startOfToday,
} from "@/lib/review/intake";
import { clampSessionToDailyCap, remainingDailyReviews } from "@/lib/review/daily-cap";
import { loadComponentMap } from "@/lib/kanji-mnemonic/context.server";
import { mergeComponents } from "@/lib/kanji-mnemonic/context";
import { extractKanji } from "@/lib/kanji-utils";

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
  let limit = Math.min(Math.max(Number(sp.get("limit")) || 50, 1), 200);
  const rawRatio = sp.get("learningRatio");
  const learningRatio = rawRatio !== null && !isNaN(parseFloat(rawRatio)) ? parseFloat(rawRatio) : 0.5;
  const rawMaxNew = sp.get("maxNewCards");
  const rawMaxLearning = sp.get("maxLearningPool");
  const maxNewCards = rawMaxNew !== null && !isNaN(parseInt(rawMaxNew, 10)) ? parseInt(rawMaxNew, 10) : undefined;
  const rawNewPerSession = sp.get("newPerSession");
  const newPerSession = rawNewPerSession !== null && !isNaN(parseInt(rawNewPerSession, 10)) ? parseInt(rawNewPerSession, 10) : undefined;
  const maxLearningPool = rawMaxLearning !== null && !isNaN(parseInt(rawMaxLearning, 10)) ? parseInt(rawMaxLearning, 10) : undefined;
  const rawMaxDaily = sp.get("maxDailyReviews");
  const maxDailyReviews = rawMaxDaily !== null && !isNaN(parseInt(rawMaxDaily, 10)) ? parseInt(rawMaxDaily, 10) : undefined;

  // Build where clauses for both vocab and kanji
  const vocabWhere: Prisma.UserFlashcardWhereInput = { userId: user.id };
  const kanjiWhere: Prisma.UserKanjiWhereInput = { userId: user.id };

  // Reviews only (learningRatio === 0) in due mode: exclude never-studied cards,
  // but keep lapsed ones (repetitions 0 after "Again", timesReviewed > 0).
  if (studyMode === "due" && learningRatio === 0) {
    vocabWhere.AND = [STUDIED_CARD_WHERE];
    kanjiWhere.AND = [STUDIED_CARD_WHERE];
  }

  if (studyMode === "due") {
    vocabWhere.nextReview = { lte: new Date() };
    kanjiWhere.nextReview = { lte: new Date() };
  } else if (studyMode === "recent") {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    vocabWhere.createdAt = { gte: sevenDaysAgo };
    kanjiWhere.createdAt = { gte: sevenDaysAgo };
  } else if (studyMode === "struggling") {
    // FSRS no longer updates easeFactor, so difficulty is the live signal;
    // unmigrated cards still fall back to their SM-2 ease.
    vocabWhere.AND = [
      { OR: [{ difficulty: { gt: 7 } }, { difficulty: null, easeFactor: { lt: 2.0 } }] },
    ];
    kanjiWhere.AND = [
      { OR: [{ difficulty: { gt: 7 } }, { difficulty: null, easeFactor: { lt: 2.0 } }] },
    ];
  } else if (studyMode === "leeches") {
    vocabWhere.AND = [
      { lapses: { gte: 3 } },
      { interval: { lt: 7 } }
    ];
    kanjiWhere.AND = [
      { lapses: { gte: 3 } },
      { interval: { lt: 7 } }
    ];
  }

  // Daily ceiling: shrink the session to what is left of today's review goal.
  // The ceiling is per learner, so vocab and kanji reviews share it.
  if (maxDailyReviews !== undefined) {
    const [reviewedVocab, reviewedKanji] = await Promise.all([
      prisma.userFlashcard.count({
        where: {
          userId: user.id,
          lastReviewedAt: { gte: startOfToday(new Date(), user.timezone) },
        },
      }),
      prisma.userKanji.count({
        where: {
          userId: user.id,
          lastReviewedAt: { gte: startOfToday(new Date(), user.timezone) },
        },
      }),
    ]);
    limit = clampSessionToDailyCap(
      limit,
      remainingDailyReviews(
        maxDailyReviews,
        (Number(reviewedVocab) || 0) + (Number(reviewedKanji) || 0)
      )
    );
    if (limit === 0) return NextResponse.json({ cards: [] });
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
    
    let allVocab = await prisma.userFlashcard.findMany({
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

    let allKanji = await prisma.userKanji.findMany({
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

    // Each type gets half the session, so each half needs its own maintenance
    // cards. Weakest-first windows otherwise return only new cards.
    const perTypeSession = Math.ceil(limit / 2);
    // Reviews-only sessions are already all studied cards; nothing to top up.
    if (
      learningRatio > 0 &&
      needsMaintenanceTopUp(allVocab, perTypeSession, learningRatio)
    ) {
      const reviewedVocab = await prisma.userFlashcard.findMany({
        where: {
          ...vocabWhere,
          AND: [...(Array.isArray(vocabWhere.AND) ? vocabWhere.AND : []), STUDIED_CARD_WHERE],
        },
        include: {
          word: true,
          wordForm: true,
          phrase: true,
        },
        orderBy: [{ nextReview: "asc" }],
        take: fetchLimit,
      });
      allVocab = mergeUniqueById(allVocab, reviewedVocab ?? []);
    }
    if (
      learningRatio > 0 &&
      needsMaintenanceTopUp(allKanji, perTypeSession, learningRatio)
    ) {
      const reviewedKanji = await prisma.userKanji.findMany({
        where: {
          ...kanjiWhere,
          AND: [...(Array.isArray(kanjiWhere.AND) ? kanjiWhere.AND : []), STUDIED_CARD_WHERE],
        },
        include: {
          kanji: true,
        },
        orderBy: [{ nextReview: "asc" }],
        take: fetchLimit,
      });
      allKanji = mergeUniqueById(allKanji, reviewedKanji ?? []);
    }

    let effectiveMaxNewCards = maxNewCards;
    if (maxNewCards !== undefined || newPerSession !== undefined) {
      const [introducedVocab, introducedKanji] = await Promise.all([
        prisma.userFlashcard.count({ where: introducedTodayWhere(user.id, new Date(), user.timezone) }),
        prisma.userKanji.count({ where: introducedTodayWhere(user.id, new Date(), user.timezone) }),
      ]);
      effectiveMaxNewCards = resolveNewAllowance({
        maxNewCards: maxNewCards ?? Number.POSITIVE_INFINITY,
        maxNewPerSession: newPerSession,
        introducedToday: (Number(introducedVocab) || 0) + (Number(introducedKanji) || 0),
      });
    }
    if (maxLearningPool !== undefined && maxLearningPool > 0) {
      const [inLearningVocab, inLearningKanji] = await Promise.all([
        prisma.userFlashcard.count({ where: { userId: user.id, ...LEARNING_CARD_WHERE } }),
        prisma.userKanji.count({ where: { userId: user.id, ...LEARNING_CARD_WHERE } }),
      ]);
      if (
        isLearningPoolFull({
          inProgress: inLearningVocab + inLearningKanji,
          maxLearningPool,
        })
      ) {
        effectiveMaxNewCards = 0;
      }
    }

    // Split limit 50/50 but allow backfill: if one type has fewer cards, donate
    // unused slots to the other so the session reaches the requested limit.
    const halfLimit = Math.ceil(limit / 2);
    // The allowance is split so the two halves sum to it. Rounding both halves
    // up turned a quota of 3 into 2 + 2 = 4 new cards in one mixed session.
    // A pool with no new cards must not strand its share: with 3 new allowed
    // and all of them kanji, kanji gets 3, not floor(3/2) = 1.
    let vocabNewBudget: number | undefined;
    let kanjiNewBudget: number | undefined;
    if (effectiveMaxNewCards !== undefined) {
      const vocabShare = Math.ceil(effectiveMaxNewCards / 2);
      const kanjiShare = Math.floor(effectiveMaxNewCards / 2);
      const vocabNewAvailable = allVocab.filter(isNewCard).length;
      const kanjiNewAvailable = allKanji.filter(isNewCard).length;
      vocabNewBudget = Math.min(vocabShare, vocabNewAvailable);
      kanjiNewBudget = Math.min(kanjiShare, kanjiNewAvailable);

      let stranded = effectiveMaxNewCards - vocabNewBudget - kanjiNewBudget;
      const kanjiExtra = Math.min(stranded, kanjiNewAvailable - kanjiNewBudget);
      kanjiNewBudget += kanjiExtra;
      stranded -= kanjiExtra;
      vocabNewBudget += Math.min(stranded, vocabNewAvailable - vocabNewBudget);
    }
    const vocabSession = composeSession(allVocab, halfLimit, ignoreDueDate, learningRatio, {
      maxNewCards: vocabNewBudget,
      maxNewPerSession: vocabNewBudget,
    });
    const kanjiSession = composeSession(allKanji, halfLimit, ignoreDueDate, learningRatio, {
      maxNewCards: kanjiNewBudget,
      maxNewPerSession: kanjiNewBudget,
    });

    const vocabActual = vocabSession.session.length;
    const kanjiActual = kanjiSession.session.length;
    const vocabNewUsed = vocabSession.session.filter(isNewCard).length;
    const kanjiNewUsed = kanjiSession.session.filter(isNewCard).length;

    // Backfill: if vocab came up short, ask kanji to fill the gap (and vice-versa)
    const vocabShortfall = halfLimit - vocabActual;
    const kanjiShortfall = halfLimit - kanjiActual;
    let vocabFinal = vocabSession.session;
    let kanjiFinal = kanjiSession.session;
    let vocabMaintenanceCards = vocabSession.maintenanceCards;
    let kanjiMaintenanceCards = kanjiSession.maintenanceCards;

    if (vocabShortfall > 0 && kanjiShortfall <= 0) {
      // Kanji has surplus; pull extra from it — but only with the allowance the
      // vocab half did not spend, so the backfill cannot spend it twice.
      const remainingNew =
        effectiveMaxNewCards !== undefined
          ? Math.max(0, effectiveMaxNewCards - vocabNewUsed)
          : undefined;
      const extraKanji = composeSession(allKanji, halfLimit + vocabShortfall, ignoreDueDate, learningRatio, {
        maxNewCards: remainingNew,
        maxNewPerSession: remainingNew,
      });
      kanjiFinal = extraKanji.session;
      kanjiMaintenanceCards = extraKanji.maintenanceCards;
    } else if (kanjiShortfall > 0 && vocabShortfall <= 0) {
      // Vocab has surplus; pull extra from it with the unspent allowance only.
      const remainingNew =
        effectiveMaxNewCards !== undefined
          ? Math.max(0, effectiveMaxNewCards - kanjiNewUsed)
          : undefined;
      const extraVocab = composeSession(allVocab, halfLimit + kanjiShortfall, ignoreDueDate, learningRatio, {
        maxNewCards: remainingNew,
        maxNewPerSession: remainingNew,
      });
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
      sourceContext: parseCardSource(card.sourceContext),
      status: card.status,
      // Counters that drive the leech badge on the card.
      timesReviewed: card.timesReviewed,
      lapses: card.lapses,
      interval: card.interval,
      repetitions: card.repetitions,
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
      timesReviewed: uk.timesReviewed,
      lapses: uk.lapses,
      interval: uk.interval,
      repetitions: uk.repetitions,
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

  // One batched lookup covers kanji primitives and the kanji inside every word.
  const componentMap = await loadComponentMap(user.id, [
    ...kanjiTransformed.flatMap((card) => card.primitives),
    ...vocabTransformed.flatMap((card) => extractKanji(card.word)),
  ]);

  return NextResponse.json({
    cards: cards.map((card) =>
      card.type === "kanji"
        ? { ...card, components: mergeComponents(card.primitives, componentMap) }
        : { ...card, wordKanji: mergeComponents(extractKanji(card.word), componentMap) }
    ),
  });
}
