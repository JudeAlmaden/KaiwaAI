import type { ReviewGrade } from "@/lib/srs";
import type { CardStatus } from "@/lib/types";
import { createScheduler, type FSRSOptions, type ReviewGrade as FSRSGrade } from "./scheduler";
import { createConverter } from "./converter";
import { FallbackHandler } from "./fallback";
import { getServerDesiredRetention, parseDesiredRetention } from "@/lib/learning-config";
import { MAX_INTERVAL_DAYS, cardStatus } from "@/lib/review/lifecycle";
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
  firstLearnedAt?: Date | null;
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
  /** False for practice reviews: they must not move the scheduling clock. */
  touchLastReviewed?: boolean;
  /** Set the first time a card is ever successfully graded. */
  firstLearnedAt?: Date;
  /** SM-2 fallback: drop stale FSRS state so the next review converts cleanly. */
  clearFsrs?: boolean;
  timesReviewedIncrement: number;
  /** 1 only for a real grade-0 review; early/practice reviews never lapse. */
  lapsesIncrement: number;
}

export interface ApplyReviewInput {
  card: ReviewableCard;
  grade: ReviewGrade;
  cardType: "flashcard" | "kanji";
  earlyReviewStrategy?: EarlyReviewStrategy;
  desiredRetention?: number;
  /**
   * A blocked-app session: grade 0 still reschedules, but it is not counted as a
   * lapse. Being interrupted into your hardest cards must not push a card toward
   * the leech threshold it is then fed back as.
   */
  suppressLapse?: boolean;
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
  const s = Math.max(stability, 0.1);
  const last = card.lastReviewedAt ? new Date(card.lastReviewedAt) : null;
  // Unknown review history means "assume the review happened on time". Using
  // the stored interval as elapsed time made R collapse to 0 for cards with a
  // long interval and blew stability up (cards were scheduled 100+ years out).
  const daysElapsed = last
    ? Math.max(0, (now.getTime() - last.getTime()) / MS_PER_DAY)
    : 9 * s * (1 / 0.9 - 1); // R = 0.9: the schedule's own desired retention
  return Math.max(0, Math.min(1, Math.pow(1 + daysElapsed / (9 * s), -1)));
}

function sm2IntervalFromStability(stability: number, retention: number): number {
  const raw =
    retention === 0.9
      ? stability
      : stability * (Math.log(retention) / Math.log(0.9));
  return Math.max(1, Math.min(MAX_INTERVAL_DAYS, Math.round(raw)));
}

/**
 * Apply FSRS scheduling (with SM-2 fallback) to a card review.
 */
export function applyFsrsReview(input: ApplyReviewInput): ReviewUpdatePayload {
  const { card, grade, cardType, earlyReviewStrategy, suppressLapse } = input;
  const retention =
    parseDesiredRetention(input.desiredRetention) ?? getServerDesiredRetention();
  const now = new Date();

  const isEarly = card.nextReview != null && new Date(card.nextReview) > now;

  // Stamp the first successful grade exactly once. Counting `repetitions === 1`
  // instead also counted old cards that had just lapsed back to zero.
  const firstLearnedAt =
    grade > 0 && card.repetitions === 0 && !card.firstLearnedAt ? now : undefined;

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
      lastReviewedAt: card.lastReviewedAt ?? now,
      // Practising early must not shift lastReviewedAt: retrievability is
      // measured from it, so touching it would weaken the next real review.
      touchLastReviewed: false,
      timesReviewedIncrement: 0,
      lapsesIncrement: 0,
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
    // A lapse is due again in 10 minutes, so the stored interval must not claim
    // days — the two used to disagree and skew mastery/leech displays.
    // When triggered from Focus Guard (suppressLapse), use a 4-hour cooldown so
    // failed cards don't haunt every subsequent app open.
    const LOCK_LAPSE_COOLDOWN_MS = 4 * 60 * 60 * 1000;
    const nextReview =
      grade === 0 && suppressLapse
        ? new Date(now.getTime() + LOCK_LAPSE_COOLDOWN_MS)
        : result.nextReview;
    const interval = grade === 0 ? 0 : sm2IntervalFromStability(result.stability, retention);
    const repetitions = grade === 0 ? 0 : card.repetitions + 1;

    return {
      easeFactor: card.easeFactor,
      interval,
      repetitions,
      // One graduation rule for both schedulers (see review/lifecycle.ts).
      status: cardStatus({ repetitions, interval }),
      nextReview,
      difficulty: result.difficulty,
      stability: result.stability,
      retrievability: result.retrievability,
      lastReviewedAt: now,
      firstLearnedAt,
      timesReviewedIncrement: 1,
      lapsesIncrement: grade === 0 && !isEarly && !suppressLapse ? 1 : 0,
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
      firstLearnedAt,
      // SM-2 wrote reps/interval; the old FSRS fields would no longer describe
      // this card, so clear them and let the next review re-convert.
      clearFsrs: true,
      timesReviewedIncrement: 1,
      lapsesIncrement: grade === 0 && !isEarly && !suppressLapse ? 1 : 0,
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
    lastReviewedAt?: Date;
    firstLearnedAt?: Date;
    timesReviewed?: { increment: number };
    lapses?: { increment: number };
    difficulty?: number | null;
    stability?: number | null;
    retrievability?: number | null;
  } = {
    easeFactor: result.easeFactor,
    interval: result.interval,
    repetitions: result.repetitions,
    status: result.status,
    nextReview: result.nextReview,
  };

  if (result.touchLastReviewed !== false) {
    data.lastReviewedAt = result.lastReviewedAt;
  }
  if (result.firstLearnedAt) {
    data.firstLearnedAt = result.firstLearnedAt;
  }

  if (result.clearFsrs) {
    data.difficulty = null;
    data.stability = null;
    data.retrievability = null;
  } else if (result.difficulty !== undefined) {
    data.difficulty = result.difficulty;
    data.stability = result.stability;
    data.retrievability = result.retrievability;
  }
  if (result.timesReviewedIncrement > 0) {
    data.timesReviewed = { increment: result.timesReviewedIncrement };
  }
  if (result.lapsesIncrement > 0) {
    data.lapses = { increment: result.lapsesIncrement };
  }
  return data;
}
