/**
 * FSRS v4 debug + state inspection endpoint.
 *
 * Usage:
 *   GET /api/debug/fsrs-state?cardId=uf_xxx      → one UserFlashcard
 *   GET /api/debug/fsrs-state?cardId=uk_xxx      → one UserKanji
 *   GET /api/debug/fsrs-state?userId=xxx&limit=20  → summary of FSRS state across user's cards
 *   GET /api/debug/fsrs-state                     → runtime FSRS parameters + defaults
 *
 * Matches design.md § 9.1 Debug Endpoints (fsrs-state inspector).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createScheduler,
  DEFAULT_FSRS_PARAMETERS,
  DEFAULT_RETENTION,
} from "@/lib/fsrs/scheduler";
import {
  DEFAULT_LEARNING_CONFIG,
  getServerDesiredRetention,
} from "@/lib/learning-config";
import { calculateCardProgress } from "@/lib/progress/calculator";
import { calculateCardStatus } from "@/lib/status/calculator";
import { createConverter, type CardMetadata } from "@/lib/fsrs/converter";
import type { CardStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CardType = "flashcard" | "kanji";

interface FsrsFields {
  id: string;
  difficulty: number | null;
  stability: number | null;
  retrievability: number | null;
  easeFactor: number;
  interval: number;
  repetitions: number;
  status: CardStatus | string;
  nextReview: Date | null;
  lastReviewedAt: Date | null;
  timesReviewed: number;
}

type FsrsFieldsWithType = FsrsFields & { __t: CardType };

async function loadCard(cardId: string): Promise<{ card: FsrsFields; type: CardType } | null> {
  const uf = await prisma.userFlashcard.findUnique({
    where: { id: cardId },
    select: {
      id: true, difficulty: true, stability: true, retrievability: true,
      easeFactor: true, interval: true, repetitions: true, status: true,
      nextReview: true, lastReviewedAt: true, timesReviewed: true,
    },
  });
  if (uf) return { card: uf as FsrsFields, type: "flashcard" };
  const uk = await prisma.userKanji.findUnique({
    where: { id: cardId },
    select: {
      id: true, difficulty: true, stability: true, retrievability: true,
      easeFactor: true, interval: true, repetitions: true, status: true,
      nextReview: true, lastReviewedAt: true, timesReviewed: true,
    },
  });
  if (uk) return { card: uk as FsrsFields, type: "kanji" };
  return null;
}

function sm2ProjectNext(s: { easeFactor: number; interval: number; repetitions: number }) {
  // Classic SM-2 projection (same grade=3 assumption FSRS comparison uses)
  let nextInterval = s.interval;
  if (s.repetitions === 0) nextInterval = 1;
  else if (s.repetitions === 1) nextInterval = 6;
  else nextInterval = Math.round(s.interval * s.easeFactor);
  return {
    easeFactorProjection: Math.max(1.3, s.easeFactor - 0.2), // grade=3 no change
    nextInterval,
  };
}

function buildCardInspection(card: FsrsFields, type: CardType, desiredRetention: number) {
  const scheduler = createScheduler({ desiredRetention });
  const converter = createConverter();

  const hasFsrs = card.difficulty != null && card.stability != null && card.retrievability != null;
  const sm2 = { easeFactor: card.easeFactor, interval: card.interval, repetitions: card.repetitions };

  const metadata: CardMetadata = {
    status: card.status as CardStatus,
    nextReview: card.nextReview ?? new Date(),
    lastReviewedAt: card.lastReviewedAt,
    timesReviewed: card.timesReviewed,
  };
  const replayed = converter.convertToFSRS(sm2, metadata);

  const fsrsProgress = calculateCardProgress({
    difficulty: card.difficulty ?? undefined,
    stability: card.stability ?? undefined,
  });
  const fsrsStatus = calculateCardStatus({
    difficulty: card.difficulty ?? null,
    stability: card.stability ?? null,
    repetitions: card.repetitions,
    currentStatus: card.status as CardStatus,
    interval: card.interval,
  });

  // What each grade would schedule next
  const gradeProjections = ([0, 1, 2, 3] as const).map((g) => {
    const sched = scheduler.schedule(
      hasFsrs
        ? { difficulty: card.difficulty!, stability: card.stability!, retrievability: card.retrievability! }
        : { difficulty: replayed.difficulty, stability: replayed.stability, retrievability: replayed.retrievability },
      g
    );
    const intervalDays = g === 0
      ? 0
      : Math.max(1, Math.round((sched.nextReview.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
    return {
      grade: g,
      label: ["Again", "Hard", "Good", "Easy"][g],
      nextReview: sched.nextReview,
      status: sched.status,
      difficultyAfter: sched.difficulty,
      stabilityAfter: sched.stability,
      intervalDays,
    };
  });

  const sm2Projection = sm2ProjectNext(sm2);
  const fsrsGood = gradeProjections[2];

  return {
    cardId: card.id,
    type,
    hasFsrs,
    lastReviewedAt: card.lastReviewedAt,
    nextReview: card.nextReview,
    current: {
      fsrs: hasFsrs
        ? { D: card.difficulty, S: card.stability, R: card.retrievability }
        : null,
      sm2: {
        easeFactor: card.easeFactor,
        interval: card.interval,
        repetitions: card.repetitions,
        status: card.status,
        timesReviewed: card.timesReviewed,
      },
      replayedFsrsFromSM2: {
        D: replayed.difficulty,
        S: replayed.stability,
        R: replayed.retrievability,
      },
    },
    calculations: {
      progress: fsrsProgress,
      classification: fsrsStatus,
    },
    projections: {
      desiredRetention,
      sm2: sm2Projection,
      fsrsGood: {
        intervalDays: fsrsGood.intervalDays,
        nextReview: fsrsGood.nextReview,
        S_after: fsrsGood.stabilityAfter,
        D_after: fsrsGood.difficultyAfter,
      },
      delta_sm2_vs_fsrs: {
        intervalDaysDiff: fsrsGood.intervalDays - sm2Projection.nextInterval,
        sm2Interval: sm2Projection.nextInterval,
        fsrsInterval: fsrsGood.intervalDays,
      },
      allGrades: gradeProjections,
    },
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cardId = searchParams.get("cardId");
  const userId = searchParams.get("userId");
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const desiredRetention = getServerDesiredRetention();

  if (cardId) {
    const loaded = await loadCard(cardId);
    if (!loaded) {
      return NextResponse.json(
        { error: "Card not found", cardId, hint: "Pass a UserFlashcard or UserKanji id" },
        { status: 404 }
      );
    }
    const inspection = buildCardInspection(loaded.card, loaded.type, desiredRetention);
    return NextResponse.json({ desiredRetention, inspection });
  }

  if (userId) {
    const [fcCards, kkCards] = await Promise.all([
      prisma.userFlashcard.findMany({
        where: { userId },
        take: limit,
        orderBy: { nextReview: "asc" },
        select: {
          id: true, difficulty: true, stability: true, retrievability: true,
          easeFactor: true, interval: true, repetitions: true, status: true,
          nextReview: true, lastReviewedAt: true, timesReviewed: true,
        },
      }),
      prisma.userKanji.findMany({
        where: { userId },
        take: limit,
        orderBy: { nextReview: "asc" },
        select: {
          id: true, difficulty: true, stability: true, retrievability: true,
          easeFactor: true, interval: true, repetitions: true, status: true,
          nextReview: true, lastReviewedAt: true, timesReviewed: true,
        },
      }),
    ]);
    const all: FsrsFieldsWithType[] = [
      ...fcCards.map(c => ({ ...(c as FsrsFields), __t: "flashcard" as const })),
      ...kkCards.map(c => ({ ...(c as FsrsFields), __t: "kanji" as const })),
    ];

    const cards = all.map(c => buildCardInspection(c, c.__t, desiredRetention));

    const migrated = cards.filter(c => c.hasFsrs).length;
    const avgD = cards.filter(c => c.hasFsrs).reduce((a, b) => a + (b.current.fsrs?.D ?? 0), 0) / Math.max(1, migrated);
    const avgS = cards.filter(c => c.hasFsrs).reduce((a, b) => a + (b.current.fsrs?.S ?? 0), 0) / Math.max(1, migrated);
    const knownCount = cards.filter(c => c.calculations.classification === "known").length;

    return NextResponse.json({
      desiredRetention,
      requested: limit,
      returned: cards.length,
      migrated,
      notMigrated: cards.length - migrated,
      aggregates: {
        avgDifficulty: Number(avgD.toFixed(2)),
        avgStabilityDays: Number(avgS.toFixed(2)),
        classifiedKnown: knownCount,
        classifiedLearning: cards.filter(c => c.calculations.classification === "learning").length,
        classifiedNew: cards.filter(c => c.calculations.classification === "new").length,
      },
      cards,
    });
  }

  // Default: runtime parameter dump + runtime defaults
  return NextResponse.json({
    runtime: {
      desiredRetention,
      effectiveRetention: desiredRetention,
      defaultRetention: DEFAULT_RETENTION,
      defaultLearningConfig: DEFAULT_LEARNING_CONFIG,
      parameters: DEFAULT_FSRS_PARAMETERS,
      parameterKeys: [
        "w0_initialS_again",
        "w1_initialS_hard",
        "w2_initialS_good",
        "w3_initialS_easy",
        "w4_initialD",
        "w5",
        "w6_DdeltaByGrade",
        "w7_DmeanReversion",
        "w8_Sgrowth_difficulty",
        "w9_Sgrowth_stability_exp",
        "w10_Sgrowth_retrievability",
        "w11_lapse_D",
        "w12_lapse_Dexp",
        "w13_lapse_Sexp",
        "w14_lapse_retrievability",
        "w15_hard_factor",
        "w16_easy_factor",
        "w17",
        "w18",
      ],
    },
    usage: {
      singleCard: "GET /api/debug/fsrs-state?cardId=uf_xxx",
      userSummary: "GET /api/debug/fsrs-state?userId=xxx&limit=20",
      paramsDump: "GET /api/debug/fsrs-state",
    },
  });
}
