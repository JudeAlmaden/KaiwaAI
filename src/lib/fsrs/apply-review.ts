import type { ReviewGrade } from "@/lib/srs";
import type { CardStatus } from "@/lib/types";
import { createScheduler, type FSRSOptions, type ReviewGrade as FSRSGrade } from "./scheduler";
import { createConverter } from "./converter";
import { FallbackHandler } from "./fallback";
import { getServerDesiredRetention, parseDesiredRetention } from "@/lib/learning-config";
import { DEFAULT_FSRS_PARAMETERS } from "./config";

export type EarlyReviewStrategy = "practice" | "proportional";

export interface ReviewableCard {
  id: string;
  userId: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  status: string;
  nextReview: Date | null;
  lastReviewedAt: Date | null;
  timesReviewed: number;
  difficulty?: number | null;
  stability?: number | null;
  retrievability?: number | null;
}

export interface ReviewUpdatePayload {
  easeFactor: number;
  interval: number;
  repetitions: number;
  status: CardStatus;
  nextReview: Date;
  difficulty?: number;
  stability?: number;
  retrievability?: number;
  lastReviewedAt: Date;
  timesReviewedIncrement: number;
}

export interface ApplyReviewInput {
  card: ReviewableCard;
  grade: ReviewGrade;
  cardType: "flashcard" | "kanji";
  earlyReviewStrategy?: EarlyReviewStrategy;
  desiredRetention?: number;
}

function hasFsrsState(card: ReviewableCard): boolean {
  return (
    card.difficulty != null &&
    card.stability != null &&
    card.retrievability != null &&
    !isNaN(card.difficulty) &&
    !isNaN(card.stability) &&
    !isNaN(card.retrievability)
  );
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Retrievability at review time via the FSRS forgetting curve,
 * R(t, S) = (1 + t/(9·S))^-1, where t = days since the last review.
 * Falls back to the scheduled interval when lastReviewedAt is unknown
 * (i.e. assume the card was reviewed on time, giving R ≈ 0.9).
 */
function recallProbability(card: ReviewableCard, stability: number, now: Date): number {
  const last = card.lastReviewedAt ? new Date(card.lastReviewedAt) : null;
  const daysElapsed = last
    ? Math.max(0, (now.getTime() - last.getTime()) / MS_PER_DAY)
    : Math.max(0, card.interval);
  const s = Math.max(stability, 0.1);
  return Math.max(0, Math.min(1, Math.pow(1 + daysElapsed / (9 * s), -1)));
}

function sm2IntervalFromStability(stability: number, retention: number): number {
  if (retention === 0.9) return Math.max(1, Math.round(stability));
  return Math.max(1, Math.round(stability * (Math.log(retention) / Math.log(0.9))));
}

/**
 * Apply FSRS scheduling (with SM-2 fallback) to a card review.
 */
export function applyFsrsReview(input: ApplyReviewInput): ReviewUpdatePayload {
  const { card, grade, cardType, earlyReviewStrategy } = input;
  const retention =
    parseDesiredRetention(input.desiredRetention) ?? getServerDesiredRetention();
  const now = new Date();

  const isEarly = card.nextReview != null && new Date(card.nextReview) > now;

  if (isEarly && earlyReviewStrategy === "practice") {
    return {
      easeFactor: card.easeFactor,
      interval: card.interval,
      repetitions: card.repetitions,
      status: card.status as CardStatus,
      nextReview: card.nextReview ?? now,
      difficulty: card.difficulty ?? undefined,
      stability: card.stability ?? undefined,
      retrievability: card.retrievability ?? undefined,
      lastReviewedAt: now,
      timesReviewedIncrement: 0,
    };
  }

  let fsrsOptions: FSRSOptions = { desiredRetention: retention };

  if (isEarly && earlyReviewStrategy === "proportional") {
    const lastReviewed = card.lastReviewedAt ? new Date(card.lastReviewedAt) : null;
    const daysElapsed = lastReviewed
      ? Math.max(0, (now.getTime() - lastReviewed.getTime()) / (1000 * 60 * 60 * 24))
      : card.interval;
    fsrsOptions = { ...fsrsOptions, isEarly: true, daysElapsed };
  }

  try {
    const scheduler = createScheduler({
      parameters: DEFAULT_FSRS_PARAMETERS,
      desiredRetention: retention,
    });

    let state: { difficulty: number; stability: number; retrievability: number };

    if (hasFsrsState(card)) {
      state = {
        difficulty: card.difficulty!,
        stability: card.stability!,
        // Recompute retrievability from the actual elapsed time. The stored
        // value is always 1.0 (R right after the previous review); feeding it
        // back would zero out the growth term (exp(w10*(1-R))-1 = 0) and
        // freeze stability — cards would repeat at the same interval forever.
        retrievability: recallProbability(card, card.stability!, now),
      };
    } else if (card.repetitions === 0 && card.timesReviewed === 0) {
      state = scheduler.initializeCard(grade as FSRSGrade);
    } else {
      const converter = createConverter();
      const converted = converter.convertToFSRS(
        {
          easeFactor: card.easeFactor,
          interval: card.interval,
          repetitions: card.repetitions,
        },
        {
          status: card.status as CardStatus,
          nextReview: card.nextReview ?? now,
          lastReviewedAt: card.lastReviewedAt,
          timesReviewed: card.timesReviewed,
        }
      );
      state = {
        difficulty: converted.difficulty,
        stability: converted.stability,
        retrievability: converted.retrievability,
      };
    }

    const result = scheduler.schedule(state, grade as FSRSGrade, fsrsOptions);
    const interval = sm2IntervalFromStability(result.stability, retention);

    return {
      easeFactor: card.easeFactor,
      interval,
      repetitions: grade === 0 ? 0 : card.repetitions + 1,
      status: result.status,
      nextReview: result.nextReview,
      difficulty: result.difficulty,
      stability: result.stability,
      retrievability: result.retrievability,
      lastReviewedAt: now,
      timesReviewedIncrement: 1,
    };
  } catch (error) {
    const sm2Options =
      isEarly && earlyReviewStrategy === "proportional" && fsrsOptions.daysElapsed != null
        ? { isEarly: true as const, daysElapsed: fsrsOptions.daysElapsed }
        : undefined;

    const fallback = FallbackHandler.handleFailure(
      {
        easeFactor: card.easeFactor,
        interval: card.interval,
        repetitions: card.repetitions,
      },
      grade,
      { cardId: card.id, userId: card.userId, cardType },
      error,
      sm2Options
    );

    return {
      easeFactor: fallback.easeFactor,
      interval: fallback.interval,
      repetitions: fallback.repetitions,
      status: fallback.status,
      nextReview: fallback.nextReview,
      lastReviewedAt: now,
      timesReviewedIncrement: 1,
    };
  }
}

/** Practice-only early review — no SRS writes except lastReviewedAt */
export function isPracticeOnlyReview(
  card: Pick<ReviewableCard, "nextReview">,
  earlyReviewStrategy?: EarlyReviewStrategy
): boolean {
  const isEarly = card.nextReview != null && new Date(card.nextReview) > new Date();
  return isEarly && earlyReviewStrategy === "practice";
}

/** Prisma update payload from a review result */
export function buildReviewPersistData(result: ReviewUpdatePayload) {
  const data: {
    easeFactor: number;
    interval: number;
    repetitions: number;
    status: CardStatus;
    nextReview: Date;
    lastReviewedAt: Date;
    timesReviewed?: { increment: number };
    difficulty?: number;
    stability?: number;
    retrievability?: number;
  } = {
    easeFactor: result.easeFactor,
    interval: result.interval,
    repetitions: result.repetitions,
    status: result.status,
    nextReview: result.nextReview,
    lastReviewedAt: result.lastReviewedAt,
  };

  if (result.difficulty !== undefined) {
    data.difficulty = result.difficulty;
    data.stability = result.stability;
    data.retrievability = result.retrievability;
  }
  if (result.timesReviewedIncrement > 0) {
    data.timesReviewed = { increment: result.timesReviewedIncrement };
  }
  return data;
}
