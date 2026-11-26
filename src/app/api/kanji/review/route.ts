import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import type { ReviewGrade } from "@/lib/srs";
import type { Prisma } from "@/generated/prisma/client";
import { composeSession } from "@/lib/session-composer";
import {
  mergeUniqueById,
  needsMaintenanceTopUp,
} from "@/lib/review/maintenance-window";
import { LEARNING_CARD_WHERE, STUDIED_CARD_WHERE } from "@/lib/review/lifecycle";
import { introducedTodayWhere, resolveNewAllowance, startOfToday } from "@/lib/review/intake";
import { clampSessionToDailyCap, remainingDailyReviews } from "@/lib/review/daily-cap";
import { DEFAULT_LEARNING_CONFIG } from "@/lib/learning-config";
import {
  applyFsrsReview,
  buildReviewPersistData,
  type EarlyReviewStrategy,
} from "@/lib/fsrs/apply-review";
import { loadComponentMap } from "@/lib/kanji-mnemonic/context.server";
import { mergeComponents } from "@/lib/kanji-mnemonic/context";

function safeJsonArray(val: string | null | undefined): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

// Fetch kanji for review with study modes
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
  const rawNewPerSession = sp.get("newPerSession");
  const maxNewCards = rawMaxNew !== null && !isNaN(parseInt(rawMaxNew, 10)) ? parseInt(rawMaxNew, 10) : undefined;
  const newPerSession = rawNewPerSession !== null && !isNaN(parseInt(rawNewPerSession, 10)) ? parseInt(rawNewPerSession, 10) : undefined;
  // A caller that sends neither quota gets the learner's default drip instead of
  // an unlimited one.
  const unsetQuota = maxNewCards === undefined && newPerSession === undefined;
  // The blocked-app session asks for a full card count; a normal study session
  // must not quietly pull in new words or study-ahead cards.
  const fillSession = sp.get("fill") === "1" || sp.get("fill") === "true";
  const maxLearningPool = rawMaxLearning !== null && !isNaN(parseInt(rawMaxLearning, 10)) ? parseInt(rawMaxLearning, 10) : undefined;
  const rawMaxDaily = sp.get("maxDailyReviews");
  const maxDailyReviews = rawMaxDaily !== null && !isNaN(parseInt(rawMaxDaily, 10)) ? parseInt(rawMaxDaily, 10) : undefined;
  const heisigLesson = sp.get("heisigLesson"); // lesson-based mode
  const groupId = sp.get("groupId"); // group-based mode

  // ── Lesson-based or group-based mode (bypasses SRS) ──────────────────────
  if (heisigLesson || groupId) {
    let kanjiIds: string[] = [];

    if (groupId === "all") {
      // Pull kanji from ALL user folders (deduplicated)
      const entries = await prisma.kanjiGroupEntry.findMany({
        where: { group: { userId: user.id } },
        select: { kanjiId: true },
        orderBy: { order: "asc" },
      });
      kanjiIds = [...new Set(entries.map((e) => e.kanjiId))];
    } else if (groupId) {
      const groupIds = groupId.split(",").map((id) => id.trim()).filter(Boolean);
      const entries = await prisma.kanjiGroupEntry.findMany({
        // Scope to the caller's own folders — groupId alone is not authorisation.
        where: { groupId: { in: groupIds }, group: { userId: user.id } },
        select: { kanjiId: true },
        orderBy: { order: "asc" },
      });
      kanjiIds = [...new Set(entries.map((e) => e.kanjiId))];
    } else if (heisigLesson) {
      const lessonKanji = await prisma.kanji.findMany({
        where: { heisigLesson: parseInt(heisigLesson) },
        select: { id: true },
        orderBy: { heisigNumber: "asc" },
        take: limit,
      });
      kanjiIds = lessonKanji.map((k) => k.id);
    }

    if (kanjiIds.length === 0) return NextResponse.json({ cards: [] });

    // Get or scaffold UserKanji records for these kanji
    const existingUK = await prisma.userKanji.findMany({
      where: { userId: user.id, kanjiId: { in: kanjiIds } },
      include: { kanji: true },
    });
    const existingIds = new Set(existingUK.map((uk) => uk.kanjiId));

    const missingIds = kanjiIds.filter((id) => !existingIds.has(id));

    // Scaffold the records the user does not own yet. Lesson mode used to return
    // `preview-<id>` placeholders, and grading one 404'd because no UserKanji row
    // matched — the review was silently lost.
    if (missingIds.length > 0) {
      await prisma.userKanji.createMany({
        data: missingIds.map((kanjiId) => ({ userId: user.id, kanjiId })),
        skipDuplicates: true,
      });
    }

    const records =
      missingIds.length > 0
        ? await prisma.userKanji.findMany({
            where: { userId: user.id, kanjiId: { in: kanjiIds } },
            include: { kanji: true },
          })
        : existingUK;

    // Combine and sort by heisig order
    const allKanji = records.map((uk) => ({
      id: uk.id,
      kanjiId: uk.kanjiId,
      character: uk.kanji.character,
      meanings: safeJsonArray(uk.kanji.meanings),
      readingsOn: safeJsonArray(uk.kanji.readingsOn),
      readingsKun: safeJsonArray(uk.kanji.readingsKun),
      radicals: safeJsonArray(uk.kanji.radicals),
      heisigNumber: uk.kanji.heisigNumber,
      heisigKeyword: uk.kanji.heisigKeyword,
      primitives: safeJsonArray(uk.kanji.primitives),
      mnemonic: uk.mnemonic,
      status: uk.status,
      _pool: "active" as const,
    }));

    // Sort by Heisig frame order (nulls last)
    allKanji.sort((a, b) => (a.heisigNumber ?? 99999) - (b.heisigNumber ?? 99999));

    const componentMap = await loadComponentMap(
      user.id,
      allKanji.flatMap((kanji) => kanji.primitives)
    );
    const cards = allKanji.map((kanji) => ({
      ...kanji,
      components: mergeComponents(kanji.primitives, componentMap),
    }));

    return NextResponse.json({ cards: cards.slice(0, limit) });
  }

  // Get user's kanji learning records
  const where: Prisma.UserKanjiWhereInput = { userId: user.id };

  // Reviews only (learningRatio === 0) in due mode: exclude never-studied cards,
  // but keep lapsed ones (repetitions 0 after "Again", timesReviewed > 0).
  if (studyMode === "due" && learningRatio === 0) {
    where.AND = [STUDIED_CARD_WHERE];
  }

  if (studyMode === "due") {
    where.nextReview = { lte: new Date() };
  } else if (studyMode === "recent") {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    where.createdAt = { gte: sevenDaysAgo };
  } else if (studyMode === "struggling") {
    // FSRS no longer updates easeFactor, so difficulty is the live signal;
    // unmigrated cards still fall back to their SM-2 ease.
    where.AND = [
      { OR: [{ difficulty: { gt: 7 } }, { difficulty: null, easeFactor: { lt: 2.0 } }] },
    ];
  } else if (studyMode === "leeches") {
    where.AND = [
      { lapses: { gte: 3 } },
      { interval: { lt: 7 } }
    ];
  }

  // Daily ceiling: shrink the session to what is left of today's review goal.
  if (maxDailyReviews !== undefined) {
    const reviewedToday =
      Number(
        await prisma.userKanji.count({
          where: {
            userId: user.id,
            lastReviewedAt: { gte: startOfToday(new Date(), user.timezone) },
          },
        })
      ) || 0;
    limit = clampSessionToDailyCap(limit, remainingDailyReviews(maxDailyReviews, reviewedToday));
    if (limit === 0) return NextResponse.json({ cards: [] });
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
    
    let allKanji = await prisma.userKanji.findMany({
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

    // A due pool smaller than the session still has to fill it: the composer
    // carries on with new cards and then studied cards that aren't due yet, so
    // hand it that second pool instead of ending the session short.
    if (fillSession && studyMode === "due" && allKanji.length < limit) {
      // A reviews-only pool holds no new cards; the cascade needs them too.
      if (learningRatio === 0) {
        const fresh = await prisma.userKanji.findMany({
          where: {
            userId: user.id,
            repetitions: 0,
            timesReviewed: 0,
            nextReview: { lte: new Date() },
          },
          include: { kanji: true },
          orderBy: [{ createdAt: "asc" }],
          take: fetchLimit,
        });
        allKanji = mergeUniqueById(allKanji, fresh ?? []);
      }
      const ahead = await prisma.userKanji.findMany({
        where: {
          ...where,
          nextReview: { gt: new Date() },
          // Reviews-only already carries the studied filter; don't stack it twice.
          AND: Array.isArray(where.AND) ? where.AND : [STUDIED_CARD_WHERE],
        },
        include: {
          kanji: true,
        },
        orderBy: [{ nextReview: "asc" }],
        take: fetchLimit,
      });
      allKanji = mergeUniqueById(allKanji, ahead ?? []);
    }

    // Weakest-first ordering lets a large new-card backlog fill the entire
    // window, so the maintenance pool never forms. Top it up separately.
    if (learningRatio > 0 && needsMaintenanceTopUp(allKanji, limit, learningRatio)) {
      const reviewed = await prisma.userKanji.findMany({
        where: {
          ...where,
          AND: [...(Array.isArray(where.AND) ? where.AND : []), STUDIED_CARD_WHERE],
        },
        include: {
          kanji: true,
        },
        orderBy: [{ nextReview: "asc" }],
        take: fetchLimit,
      });
      allKanji = mergeUniqueById(allKanji, reviewed ?? []);
    }

    let effectiveMaxNewCards = unsetQuota
      ? DEFAULT_LEARNING_CONFIG.maxNewCards
      : maxNewCards;
    const effectiveNewPerSession = unsetQuota
      ? DEFAULT_LEARNING_CONFIG.newPerSession
      : newPerSession;
    if (maxNewCards !== undefined || newPerSession !== undefined) {
      const introducedToday =
        Number(
          await prisma.userKanji.count({
            where: introducedTodayWhere(user.id, new Date(), user.timezone),
          })
        ) || 0;
      effectiveMaxNewCards = resolveNewAllowance({
        maxNewCards: maxNewCards ?? Number.POSITIVE_INFINITY,
        maxNewPerSession: newPerSession,
        introducedToday,
      });
    }
    if (maxLearningPool !== undefined && maxLearningPool > 0) {
      const inLearningCount = await prisma.userKanji.count({
        where: { userId: user.id, ...LEARNING_CARD_WHERE },
      });
      if (inLearningCount >= maxLearningPool) {
        effectiveMaxNewCards = 0;
      }
    }

    // Compose session based on learningRatio
    // For studyMode=all, ignoreDueDate allows maintenance pool to include all cards
    const { session, maintenanceCards } = composeSession(
      allKanji,
      limit,
      ignoreDueDate,
      learningRatio,
      { maxNewCards: effectiveMaxNewCards, maxNewPerSession: effectiveNewPerSession, fillSession }
    );
    const maintenanceIds = new Set(maintenanceCards.map((c) => c.id));
    userKanji = session.map((c) => ({ ...c, _isMaintenance: maintenanceIds.has(c.id) }));
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
  const cards = userKanji.map((uk) => {
    const meanings = safeJsonArray(uk.kanji.meanings);
    const readingsOn = safeJsonArray(uk.kanji.readingsOn);
    const readingsKun = safeJsonArray(uk.kanji.readingsKun);
    const radicals = safeJsonArray(uk.kanji.radicals);
    const primitives = safeJsonArray(uk.kanji.primitives);

    // customMeaning (user's personal Heisig RTK keyword) is prepended; deduplicate if already in shared list
    const displayMeanings = uk.customMeaning
      ? [uk.customMeaning, ...meanings.filter((m) => m !== uk.customMeaning)]
      : meanings;

    return {
      id: uk.id,
      type: "kanji" as const,
      character: uk.kanji.character,
      meanings: displayMeanings,
      readingsOn,
      readingsKun,
      radicals,
      heisigNumber: uk.kanji.heisigNumber ?? null,
      heisigLesson: uk.kanji.heisigLesson ?? null,
      heisigKeyword: uk.kanji.heisigKeyword ?? null,
      customMeaning: uk.customMeaning ?? null,
      primitives,
      mnemonic: uk.mnemonic ?? null,
      status: uk.status,
      timesReviewed: uk.timesReviewed,
      lapses: uk.lapses,
      interval: uk.interval,
      repetitions: uk.repetitions,
      _pool: (uk as typeof uk & { _isMaintenance?: boolean })._isMaintenance
        ? ("maintenance" as const)
        : ("active" as const),
    };
  });

  const componentMap = await loadComponentMap(
    user.id,
    cards.flatMap((card) => card.primitives)
  );

  return NextResponse.json({
    cards: cards.map((card) => ({
      ...card,
      components: mergeComponents(card.primitives, componentMap),
    })),
  });
}

// Grade a kanji card via FSRS v4 (SM-2 fallback on error).
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    cardId?: string;
    grade?: number;
    earlyReviewStrategy?: EarlyReviewStrategy;
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

  const userKanji = await prisma.userKanji.findFirst({
    where: { id: body.cardId, userId: user.id },
  });
  if (!userKanji) return NextResponse.json({ error: "Card not found." }, { status: 404 });

  const fsrsResult = applyFsrsReview({
    card: {
      id: userKanji.id,
      userId: userKanji.userId,
      easeFactor: userKanji.easeFactor,
      interval: userKanji.interval,
      repetitions: userKanji.repetitions,
      status: userKanji.status,
      nextReview: userKanji.nextReview,
      lastReviewedAt: userKanji.lastReviewedAt,
      firstLearnedAt: userKanji.firstLearnedAt,
      timesReviewed: userKanji.timesReviewed,
      difficulty: userKanji.difficulty,
      stability: userKanji.stability,
      retrievability: userKanji.retrievability,
    },
    grade: grade as ReviewGrade,
    cardType: "kanji",
    earlyReviewStrategy: body.earlyReviewStrategy,
    desiredRetention: body.desiredRetention,
    suppressLapse: body.fromLock === true,
  });

  const persist = buildReviewPersistData(fsrsResult);

  const updated = await prisma.userKanji.update({
    where: { id: userKanji.id },
    data: persist,
  });

  return NextResponse.json({ card: updated });
}
