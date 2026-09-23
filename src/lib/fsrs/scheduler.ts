import type { CardStatus } from "../types";

/**
 * FSRS v4 (Free Spaced Repetition Scheduler) implementation.
 * Uses a DSR (Difficulty, Stability, Retrievability) model for adaptive scheduling.
 * 
 * Based on the FSRS v4 algorithm from https://github.com/open-spaced-repetition/fsrs4anki
 */

export type ReviewGrade = 0 | 1 | 2 | 3;

/**
 * FSRS state representing a card's current memory state.
 * - difficulty: 1-10 scale representing how hard a card is for the user
 * - stability: Days until retrievability drops from 100% to desired retention (90%)
 * - retrievability: 0-1 probability of successful recall based on stability and elapsed time
 */
export interface FSRSState {
  difficulty: number;
  stability: number;
  retrievability: number;
}

/**
 * FSRS scheduling result including next review date and card status.
 */
export interface FSRSResult extends FSRSState {
  status: CardStatus;
  nextReview: Date;
}

/**
 * Options for FSRS scheduling.
 */
export interface FSRSOptions {
  /** Review before scheduled date (proportional interval scaling) */
  isEarly?: boolean;
  /** Actual days since last review (for early review calculation) */
  daysElapsed?: number;
  /** Target retention rate (0.7-0.98, default 0.9) */
  desiredRetention?: number;
  /** Custom 19 FSRS parameters (w0-w18) */
  parameters?: number[];
}

/**
 * Default FSRS v4 parameters optimized for vocabulary learning.
 * These 19 parameters (w0-w18) control the FSRS algorithm behavior.
 * 
 * w0-w3: Initial stability for grades 0-3 (Again, Hard, Good, Easy)
 * w4: Initial difficulty
 * w5-w7: Difficulty adjustment parameters
 * w8-w10: Stability growth parameters for successful reviews
 * w11-w14: Stability after lapse (Again grade)
 * w15-w16: Grade-specific adjustment factors
 * w17-w18: Short-term memory parameters (reserved for future use)
 */
export const DEFAULT_FSRS_PARAMETERS = [
  // Initial stability: w0-w3
  0.4, 0.6, 2.4, 5.8,
  // Initial difficulty: w4
  4.93,
  // Difficulty adjustment: w5-w7
  0.94, 0.86, 0.01,
  // Stability growth: w8-w10
  1.49, 0.14, 0.94,
  // Stability after lapse: w11-w14
  2.18, 0.05, 0.34, 1.26,
  // Grade adjustment: w15-w16
  0.29, 2.61,
  // Short-term: w17-w18
  0.0, 0.0,
];

/** Default desired retention rate (90%) */
export const DEFAULT_RETENTION = 0.9;

/** Minimum and maximum bounds for difficulty */
const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 10;

/** Minimum stability (in days) */
const MIN_STABILITY = 0.1;

/** Status thresholds */
const KNOWN_STABILITY = 21; // days
const KNOWN_DIFFICULTY = 6;

/**
 * FSRS v4 Scheduler implementation.
 */
export class FSRSScheduler {
  private parameters: number[];
  private desiredRetention: number;

  constructor(
    parameters: number[] = DEFAULT_FSRS_PARAMETERS,
    desiredRetention: number = DEFAULT_RETENTION
  ) {
    this.parameters = this.validateParameters(parameters);
    this.desiredRetention = this.validateRetention(desiredRetention);
  }

  /**
   * Validate FSRS parameters are within acceptable ranges.
   */
  private validateParameters(params: number[]): number[] {
    if (params.length !== 19) {
      console.warn(
        `FSRS: Expected 19 parameters, got ${params.length}. Using defaults.`
      );
      return DEFAULT_FSRS_PARAMETERS;
    }
    return params;
  }

  /**
   * Validate desired retention is within acceptable range (70%-98%).
   */
  private validateRetention(retention: number): number {
    if (retention < 0.7 || retention > 0.98) {
      console.warn(
        `FSRS: Desired retention ${retention} out of range [0.7, 0.98]. Using default 0.9.`
      );
      return DEFAULT_RETENTION;
    }
    return retention;
  }

  /**
   * Calculate initial FSRS state for a new card based on first review grade.
   * 
   * @param firstGrade - Grade from first review (0=Again, 1=Hard, 2=Good, 3=Easy)
   * @returns Initial FSRS state
   */
  initializeCard(firstGrade: ReviewGrade): FSRSState {
    const w = this.parameters;
    
    // Initial stability based on grade: S0 = w[grade]
    const stability = w[firstGrade];
    
    // Initial difficulty: D0 = w4
    const difficulty = w[4];
    
    // Retrievability = 1.0 (just reviewed)
    const retrievability = 1.0;

    return {
      difficulty: this.clampDifficulty(difficulty),
      stability: Math.max(stability, MIN_STABILITY),
      retrievability,
    };
  }

  /**
   * Schedule a card review using FSRS v4 algorithm.
   * 
   * @param state - Current FSRS state
   * @param grade - Review grade (0=Again, 1=Hard, 2=Good, 3=Easy)
   * @param options - Optional configuration
   * @returns New FSRS state and next review date
   */
  schedule(
    state: FSRSState,
    grade: ReviewGrade,
    options: FSRSOptions = {}
  ): FSRSResult {
    const retention = options.desiredRetention ?? this.desiredRetention;
    const params = options.parameters ?? this.parameters;

    // Calculate new difficulty
    const newDifficulty = this.updateDifficulty(state.difficulty, grade, params);

    // Calculate new stability based on grade
    let newStability: number;
    if (grade === 0) {
      // Lapse: use lapse stability formula
      newStability = this.calculateLapseStability(
        state.stability,
        state.retrievability,
        newDifficulty,
        params
      );
    } else {
      // Successful review: use success stability formula
      newStability = this.calculateSuccessStability(
        state.stability,
        state.retrievability,
        newDifficulty,
        grade,
        params,
        options
      );
    }

    // Ensure minimum stability
    newStability = Math.max(newStability, MIN_STABILITY);

    // Calculate next interval based on desired retention and new stability
    const interval = this.calculateInterval(newStability, retention);

    // Calculate next review date
    const nextReview = new Date();
    if (grade === 0) {
      // Failed cards come back in ~10 minutes
      nextReview.setTime(Date.now() + 10 * 60 * 1000);
    } else {
      nextReview.setDate(nextReview.getDate() + Math.max(Math.round(interval), 1));
    }

    // Retrievability is 1.0 immediately after review
    const retrievability = 1.0;

    // Determine card status
    const status = this.determineStatus(newStability, newDifficulty, grade);

    return {
      difficulty: newDifficulty,
      stability: newStability,
      retrievability,
      status,
      nextReview,
    };
  }

  /**
   * Calculate retrievability (forgetting curve) based on time elapsed and stability.
   * Formula: R(t, S) = (1 + t/(9*S))^(-1)
   * 
   * @param daysElapsed - Days since last review
   * @param stability - Current stability in days
   * @returns Retrievability (0-1)
   */
  calculateRetrievability(daysElapsed: number, stability: number): number {
    if (daysElapsed < 0) daysElapsed = 0;
    if (stability <= 0) stability = MIN_STABILITY;
    
    const retrievability = Math.pow(1 + daysElapsed / (9 * stability), -1);
    return Math.max(0, Math.min(1, retrievability));
  }

  /**
   * Update difficulty based on review grade.
   * Formula:
   *   D' = D - w6 * (grade - 3)
   *   D'' = (1 - w7) * D' + w7 * D_init
   *   D_new = clamp(D'', 1, 10)
   * 
   * @param currentDifficulty - Current difficulty
   * @param grade - Review grade (0-3, but mapped to 1-4 for calculation)
   * @param params - FSRS parameters
   * @returns Updated difficulty
   */
  private updateDifficulty(
    currentDifficulty: number,
    grade: ReviewGrade,
    params: number[]
  ): number {
    const w = params;
    const gradeAdjusted = grade + 1; // Map 0-3 to 1-4
    
    // D' = D - w6 * (grade - 3)
    const difficultyDelta = currentDifficulty - w[6] * (gradeAdjusted - 4);
    
    // D'' = (1 - w7) * D' + w7 * D_init (mean reversion to initial difficulty)
    const difficulty = (1 - w[7]) * difficultyDelta + w[7] * w[4];
    
    return this.clampDifficulty(difficulty);
  }

  /**
   * Calculate new stability after a successful review (grade 1-3).
   * Formula:
   *   S_new = S_old * (1 + exp(w8) * (11 - D) * S^(-w9) * (exp(w10 * (1 - R)) - 1) * hardFactor * easyFactor)
   * 
   * @param stability - Current stability
   * @param retrievability - Current retrievability
   * @param difficulty - New difficulty
   * @param grade - Review grade (1=Hard, 2=Good, 3=Easy)
   * @param params - FSRS parameters
   * @param options - Options for early review handling
   * @returns New stability
   */
  private calculateSuccessStability(
    stability: number,
    retrievability: number,
    difficulty: number,
    grade: ReviewGrade,
    params: number[],
    options: FSRSOptions
  ): number {
    const w = params;
    
    // Handle early review with proportional scaling
    if (options.isEarly && options.daysElapsed !== undefined) {
      const scheduledInterval = this.calculateInterval(stability, this.desiredRetention);
      if (options.daysElapsed < scheduledInterval) {
        // Scale the stability proportionally
        const earlyFactor = options.daysElapsed / scheduledInterval;
        stability = stability * earlyFactor;
      }
    }
    
    // Hard factor (w15): < 1 for Hard, 1 for Good/Easy
    const hardFactor = grade === 1 ? w[15] : 1;
    
    // Easy factor (w16): 1 for Hard/Good, > 1 for Easy
    const easyFactor = grade === 3 ? w[16] : 1;
    
    // S_new = S_old * (1 + exp(w8) * (11 - D) * S^(-w9) * (exp(w10 * (1 - R)) - 1) * hardFactor * easyFactor)
    const stabilityGrowth =
      Math.exp(w[8]) *
      (11 - difficulty) *
      Math.pow(stability, -w[9]) *
      (Math.exp(w[10] * (1 - retrievability)) - 1) *
      hardFactor *
      easyFactor;
    
    const newStability = stability * (1 + stabilityGrowth);
    
    return Math.max(newStability, MIN_STABILITY);
  }

  /**
   * Calculate new stability after a lapse (grade 0 = Again).
   * Formula:
   *   S_new = w11 * D^(-w12) * ((S+1)^w13 - 1) * exp(w14 * (1 - R))
   * 
   * @param stability - Current stability
   * @param retrievability - Current retrievability
   * @param difficulty - New difficulty
   * @param params - FSRS parameters
   * @returns New stability after lapse
   */
  private calculateLapseStability(
    stability: number,
    retrievability: number,
    difficulty: number,
    params: number[]
  ): number {
    const w = params;
    
    // S_new = w11 * D^(-w12) * ((S+1)^w13 - 1) * exp(w14 * (1 - R))
    const newStability =
      w[11] *
      Math.pow(difficulty, -w[12]) *
      (Math.pow(stability + 1, w[13]) - 1) *
      Math.exp(w[14] * (1 - retrievability));
    
    return Math.max(newStability, MIN_STABILITY);
  }

  /**
   * Calculate the next review interval based on desired retention and stability.
   * Formula: I = S * (ln(desired_retention) / ln(0.9))
   * When desired_retention = 0.9, I = S
   * 
   * @param stability - Current stability
   * @param desiredRetention - Target retention rate
   * @returns Interval in days
   */
  private calculateInterval(stability: number, desiredRetention: number): number {
    if (desiredRetention === 0.9) {
      return stability;
    }
    
    const interval = stability * (Math.log(desiredRetention) / Math.log(0.9));
    return Math.max(interval, MIN_STABILITY);
  }

  /**
   * Determine card status based on stability and difficulty.
   * - Known: stability > 21 days AND difficulty < 6
   * - Learning: otherwise
   * - New: handled by caller (not determined here)
   * 
   * @param stability - Current stability
   * @param difficulty - Current difficulty
   * @param grade - Current review grade
   * @returns Card status
   */
  private determineStatus(
    stability: number,
    difficulty: number,
    grade: ReviewGrade
  ): CardStatus {
    // Failed reviews reset to learning
    if (grade === 0) {
      return "learning";
    }
    
    // Known threshold: high stability and low difficulty
    if (stability > KNOWN_STABILITY && difficulty < KNOWN_DIFFICULTY) {
      return "known";
    }
    
    return "learning";
  }

  /**
   * Clamp difficulty to valid range [1, 10].
   */
  private clampDifficulty(difficulty: number): number {
    return Math.max(MIN_DIFFICULTY, Math.min(MAX_DIFFICULTY, difficulty));
  }
}

/**
 * Create a default FSRS scheduler instance.
 */
export function createScheduler(
  options: { parameters?: number[]; desiredRetention?: number } = {}
): FSRSScheduler {
  return new FSRSScheduler(options.parameters, options.desiredRetention);
}
