import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import type { ReviewGrade } from "@/lib/srs";
import { composeSession } from "@/lib/session-composer";
import {
  applyFsrsReview,
  buildReviewPersistData,
  type EarlyReviewStrategy,
} from "@/lib/fsrs/apply-review";

// Fetch kanji for review with study modes
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const studyMode = sp.get("studyMode") ?? "due";
  const limit = Math.min(Math.max(Number(sp.get("limit")) || 50, 1), 200);
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
      const entries = await prisma.kanjiGroupEntry.findMany({
        where: { groupId },
        select: { kanjiId: true },
        orderBy: { order: "asc" },
      });
      kanjiIds = entries.map((e) => e.kanjiId);
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

    // Fetch kanji info for ones without UserKanji records
    const missingIds = kanjiIds.filter((id) => !existingIds.has(id));
    const missingKanji =
      missingIds.length > 0
        ? await prisma.kanji.findMany({
            where: { id: { in: missingIds } },
          })
        : [];

    // Combine and sort by heisig order
    const allKanji = [
      ...existingUK.map((uk) => ({
        id: uk.id,
        kanjiId: uk.kanjiId,
        character: uk.kanji.character,
        meanings: JSON.parse(uk.kanji.meanings) as string[],
        readingsOn: JSON.parse(uk.kanji.readingsOn) as string[],
        readingsKun: JSON.parse(uk.kanji.readingsKun) as string[],
        radicals: JSON.parse(uk.kanji.radicals) as string[],
        heisigNumber: uk.kanji.heisigNumber,
        heisigKeyword: uk.kanji.heisigKeyword,
        mnemonic: uk.mnemonic,
        status: uk.status,
        _pool: "active" as const,
      })),
      ...missingKanji.map((k) => ({
        id: `preview-${k.id}`, // preview-only, not a real UserKanji ID
        kanjiId: k.id,
        character: k.character,
        meanings: JSON.parse(k.meanings) as string[],
        readingsOn: JSON.parse(k.readingsOn) as string[],
        readingsKun: JSON.parse(k.readingsKun) as string[],
        radicals: JSON.parse(k.radicals) as string[],
        heisigNumber: k.heisigNumber,
        heisigKeyword: k.heisigKeyword,
        mnemonic: null,
        status: "new" as const,
        _pool: "active" as const,
      })),
    ];

    // Sort by Heisig frame order (nulls last)
    allKanji.sort((a, b) => (a.heisigNumber ?? 99999) - (b.heisigNumber ?? 99999));

    return NextResponse.json({ cards: allKanji.slice(0, limit) });
  }

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
    const { session, maintenanceCards } = composeSession(allKanji, limit, ignoreDueDate);
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
    let meanings: string[];
    try { meanings = JSON.parse(uk.kanji.meanings); } catch { meanings = []; }
    let readingsOn: string[];
    try { readingsOn = JSON.parse(uk.kanji.readingsOn); } catch { readingsOn = []; }
    let readingsKun: string[];
    try { readingsKun = JSON.parse(uk.kanji.readingsKun); } catch { readingsKun = []; }
    let radicals: string[];
    try { radicals = JSON.parse(uk.kanji.radicals); } catch { radicals = []; }

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
      mnemonic: uk.mnemonic ?? null,
      status: uk.status,
      _pool: (uk as typeof uk & { _isMaintenance?: boolean })._isMaintenance
        ? ("maintenance" as const)
        : ("active" as const),
    };
  });

  return NextResponse.json({ cards });
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
  };
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
      timesReviewed: userKanji.timesReviewed,
      difficulty: userKanji.difficulty,
      stability: userKanji.stability,
      retrievability: userKanji.retrievability,
    },
    grade: body.grade as ReviewGrade,
    cardType: "kanji",
    earlyReviewStrategy: body.earlyReviewStrategy,
    desiredRetention: body.desiredRetention,
  });

  const persist = buildReviewPersistData(fsrsResult);

  const updated = await prisma.userKanji.update({
    where: { id: userKanji.id },
    data: persist,
  });

  return NextResponse.json({ card: updated });
}
