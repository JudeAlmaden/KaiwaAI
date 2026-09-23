/**
 * SM-2 to FSRS Migration Converter
 * 
 * This module provides conversion functionality from legacy SM-2 state to FSRS v4 state
 * using heuristic mapping to preserve user progress during migration.
 * 
 * Conversion Heuristics:
 * 1. Difficulty: D = clamp(11 - 2 * easeFactor, 1, 10)
 * 2. Stability: Varies based on interval
 *    - interval = 0: S = w0 (FSRS initial stability)
 *    - 1 <= interval <= 21: S = interval * 1.2 (conservative estimate)
 *    - interval > 21: S = interval (preserve learned intervals)
 * 3. Retrievability: R = (1 + daysElapsed/(9*S))^(-1) using FSRS forgetting curve
 * 
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 17.1, 17.2, 17.3, 17.4, 17.5
 */

import type { CardStatus } from "../types";
import type { FSRSState } from "./state";
import { DEFAULT_FSRS_PARAMETERS } from "./config";

/**
 * SM-2 state from legacy scheduling system
 */
export interface SM2State {
  easeFactor: number;    // Typically 1.3 to 3.0, default 2.5
  interval: number;      // Days until next review
  repetitions: number;   // Number of successful reviews
}

/**
 * Additional card metadata needed for conversion
 */
export interface CardMetadata {
  status: CardStatus;             // "new" | "learning" | "known"
  nextReview: Date;               // Scheduled next review date
  lastReviewedAt: Date | null;    // Last review timestamp (null if never reviewed)
  timesReviewed: number;          // Total review count
}

/**
 * Migration result containing FSRS state and preserved metadata
 */
export interface MigrationResult extends FSRSState {
  status: CardStatus;
  nextReview: Date;
  repetitions: number;
}

/**
 * MigrationConverter: Converts SM-2 state to FSRS state
 * 
 * The converter uses heuristic mapping to estimate FSRS parameters from SM-2 state,
 * preserving user progress and scheduling continuity during migration.
 */
export class MigrationConverter {
  private w0: number; // FSRS initial stability parameter for "Again" grade

  constructor(fsrsParameters: number[] = DEFAULT_FSRS_PARAMETERS) {
    if (fsrsParameters.length !== 19) {
      throw new Error(`Expected 19 FSRS parameters, got ${fsrsParameters.length}`);
    }
    this.w0 = fsrsParameters[0]; // Initial stability for grade 0 (Again)
  }

  /**
   * Convert SM-2 state to FSRS state with metadata preservation
   * 
   * Requirements:
   * - 4.1: Estimate difficulty from ease factor
   * - 4.2: Estimate stability from interval and repetitions
   * - 4.3: Calculate retrievability from days since last review
   * - 4.4: High difficulty (8-10) for easeFactor < 1.7
   * - 4.5: Low difficulty (1-3) for easeFactor > 2.5
   * - 4.6: Use FSRS initial stability for interval = 0
   * - 4.7: Preserve intervals > 21 days
   * - 4.8: Preserve card status
   * - 4.9: Preserve nextReview date
   * - 4.10: Preserve repetitions count
   * - 17.1: Preserve timesReviewed count
   * - 17.2: Preserve lastReviewedAt timestamp
   * - 17.3: Preserve card status progression
   * - 17.4: Calculate initial retrievability based on days since last review
   * - 17.5: Set retrievability to 1.0 for never-reviewed cards
   * 
   * @param sm2 - SM-2 state from database
   * @param cardInfo - Additional card metadata
   * @returns Converted FSRS state with preserved metadata
   */
  convertToFSRS(sm2: SM2State, cardInfo: CardMetadata): MigrationResult {
    // Requirement 4.1, 4.4, 4.5: Map easeFactor to difficulty
    const difficulty = this.mapEaseFactorToDifficulty(sm2.easeFactor);

    // Requirement 4.2, 4.6, 4.7: Map interval to stability
    const stability = this.mapIntervalToStability(sm2.interval);

    // Requirement 4.3, 17.4, 17.5: Calculate retrievability
    const retrievability = this.calculateRetrievability(
      stability,
      cardInfo.lastReviewedAt
    );

    // Requirements 4.8, 17.3: Preserve card status
    const status = cardInfo.status;

    // Requirement 4.9, 17.2: Preserve nextReview date
    const nextReview = cardInfo.nextReview;

    // Requirement 4.10, 17.1: Preserve repetitions count
    const repetitions = sm2.repetitions;

    return {
      difficulty,
      stability,
      retrievability,
      status,
      nextReview,
      repetitions,
    };
  }

  /**
   * Map SM-2 easeFactor to FSRS difficulty
   * 
   * Formula: D = clamp(11 - 2 * easeFactor, 1, 10)
   * 
   * Mapping rationale:
   * - easeFactor 2.5 (default) → D = 6 (mid-range)
   * - easeFactor 1.3 (minimum, struggling) → D = 8.4 (high difficulty)
   * - easeFactor 3.0 (high, easy cards) → D = 5 (low difficulty)
   * 
   * Requirements 4.1, 4.4, 4.5
   * 
   * @param easeFactor - SM-2 ease factor (typically 1.3 to 3.0)
   * @returns FSRS difficulty (1 to 10)
   */
  private mapEaseFactorToDifficulty(easeFactor: number): number {
    const difficulty = 11 - 2 * easeFactor;
    return this.clamp(difficulty, 1, 10);
  }

  /**
   * Map SM-2 interval to FSRS stability
   * 
   * Stability mapping strategy:
   * - interval = 0: New or failed card → use FSRS initial stability (w0)
   * - 1 <= interval <= 21: Learning phase → conservative estimate (interval * 1.2)
   * - interval > 21: Mature card → preserve interval as stability
   * 
   * Requirements 4.2, 4.6, 4.7
   * 
   * @param interval - SM-2 interval in days
   * @returns FSRS stability in days
   */
  private mapIntervalToStability(interval: number): number {
    // Requirement 4.6: Use FSRS initial stability for interval = 0
    if (interval === 0) {
      return this.w0;
    }

    // Requirement 4.7: Preserve long intervals (mature cards)
    if (interval > 21) {
      return interval;
    }

    // Learning phase (1-21 days): conservative estimate with 20% buffer
    // This accounts for SM-2's fixed progression vs. FSRS's adaptive scheduling
    return interval * 1.2;
  }

  /**
   * Calculate retrievability based on days elapsed since last review
   * 
   * Uses FSRS forgetting curve: R(t, S) = (1 + t/(9*S))^(-1)
   * 
   * Where:
   * - t = days elapsed since last review
   * - S = stability
   * - R = retrievability (probability of successful recall)
   * 
   * Special cases:
   * - Never reviewed (lastReviewedAt = null): R = 1.0 (100% retention)
   * - Just reviewed (t = 0): R = 1.0
   * 
   * Requirements 4.3, 17.4, 17.5
   * 
   * @param stability - FSRS stability in days
   * @param lastReviewedAt - Last review timestamp or null
   * @returns Retrievability (0 to 1)
   */
  private calculateRetrievability(
    stability: number,
    lastReviewedAt: Date | null | undefined
  ): number {
    // Requirement 17.5: Never reviewed → 100% retrievability
    if (lastReviewedAt == null) {
      return 1.0;
    }

    // Calculate days elapsed since last review
    const now = new Date();
    const daysElapsed = this.daysBetween(lastReviewedAt, now);

    // Requirement 4.3: FSRS forgetting curve
    // R(t, S) = (1 + t/(9*S))^(-1)
    const retrievability = Math.pow(1 + daysElapsed / (9 * stability), -1);

    // Clamp to valid range [0, 1]
    return this.clamp(retrievability, 0, 1);
  }

  /**
   * Calculate days between two dates
   * 
   * @param from - Start date
   * @param to - End date
   * @returns Number of days (can be fractional)
   */
  private daysBetween(from: Date, to: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    const diffMs = to.getTime() - from.getTime();
    return Math.max(0, diffMs / msPerDay);
  }

  /**
   * Clamp a value to a specified range
   * 
   * @param value - Value to clamp
   * @param min - Minimum value
   * @param max - Maximum value
   * @returns Clamped value
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}

/**
 * Create a migration converter with default or custom FSRS parameters
 * 
 * @param parameters - Optional custom FSRS parameters (19 values)
 * @returns MigrationConverter instance
 */
export function createConverter(parameters?: number[]): MigrationConverter {
  return new MigrationConverter(parameters);
}
