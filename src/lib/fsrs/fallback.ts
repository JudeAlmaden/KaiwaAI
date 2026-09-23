import { applyReview, type ReviewGrade, type SrsState } from "@/lib/srs";
import type { CardStatus } from "@/lib/types";

export interface FallbackContext {
  cardId: string;
  userId: string;
  cardType: "flashcard" | "kanji";
}

export interface FallbackResult {
  easeFactor: number;
  interval: number;
  repetitions: number;
  status: CardStatus;
  nextReview: Date;
  usedFallback: true;
}

/**
 * Gracefully fall back to SM-2 when FSRS scheduling fails.
 */
export class FallbackHandler {
  static handleFailure(
    sm2: SrsState,
    grade: ReviewGrade,
    context: FallbackContext,
    error: unknown,
    options?: { isEarly?: boolean; daysElapsed?: number }
  ): FallbackResult {
    FallbackHandler.logFallback(context, error);

    const result = options
      ? applyReview(sm2, grade, options)
      : applyReview(sm2, grade);

    return { ...result, usedFallback: true };
  }

  static logFallback(context: FallbackContext, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[fsrs.scheduling.fallback]", {
      reason: message,
      cardId: context.cardId,
      userId: context.userId,
      cardType: context.cardType,
      stack,
    });
  }
}
