/**
 * Unit + property tests for FSRS card progress calculation.
 *
 * Property tests (100 iterations each, § Correctness Properties in design.md):
 *   Property 14: Progress Calculation Bounds — 0 ≤ progress ≤ 1 for all inputs
 *
 * Validates: Requirements 9.1–9.6 (bounds, thresholds, dual-input, fallback)
 */

import { describe, it, expect } from "vitest";
import { calculateCardProgress } from "./calculator";

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}
function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

describe("calculateCardProgress — unit tests for progress formula", () => {
  it("returns progress >= 0.9 when stability >= 90 and difficulty <= 5", () => {
    // Requirement 9.3: S>=90d AND D<=5 → progress >= 0.9
    // S=90, D=4: 0.7*(90/90) + 0.3*((10-4)/9) = 0.7 + 0.3*0.667 = 0.90, rounded to 0.90
    const p = calculateCardProgress({ difficulty: 4, stability: 90 });
    expect(p).toBeGreaterThanOrEqual(0.9);
  });

  it("returns progress below 0.3 when stability <= 3 days", () => {
    // Requirement 9.4: S<3d OR D>8 → progress < 0.3
    const p = calculateCardProgress({ difficulty: 5, stability: 2 });
    expect(p).toBeLessThan(0.3);
  });

  it("returns progress below 0.3 when difficulty >= 8", () => {
    // Requirement 9.4: low stability or high difficulty → low progress
    const p = calculateCardProgress({ difficulty: 9, stability: 30 });
    expect(p).toBeLessThan(0.3);
  });

  it("returns progress near 1.0 for 'mastered' card (S=365, D=1)", () => {
    const p = calculateCardProgress({ difficulty: 1, stability: 365 });
    expect(p).toBeCloseTo(1.0, 2);
  });

  it("returns progress 0.0 when no FSRS AND no SM-2 input", () => {
    const p = calculateCardProgress({});
    expect(p).toBe(0);
  });

  it("falls back to SM-2 progress when FSRS fields are null", () => {
    // SM-2 progress: (clamp(reps/3,0,1) + clamp(interval/21,0,1)) / 2
    // reps=3, interval=21 → (1 + 1) / 2 = 1.0
    const p = calculateCardProgress({
      difficulty: null,
      stability: null,
      easeFactor: 2.5,
      interval: 21,
      repetitions: 3,
    });
    expect(p).toBeCloseTo(1.0, 2);
  });

  it("prefers FSRS progress when both FSRS and SM-2 fields are present", () => {
    // FSRS: D=4, S=91 → 0.7*(91/90)=0.7078 + 0.3*(6/9)=0.2 → total ~0.9078
    // SM-2: reps=0, interval=0 → would be 0.0
    // Result should be FSRS-driven (>= 0.9)
    const p = calculateCardProgress({
      difficulty: 4,
      stability: 91,
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
    });
    expect(p).toBeGreaterThanOrEqual(0.9);
  });

  it("treats NaN FSRS fields as missing (falls through to SM-2)", () => {
    const p = calculateCardProgress({
      difficulty: NaN,
      stability: NaN,
      easeFactor: 2.5,
      interval: 21,
      repetitions: 3,
    });
    expect(p).toBeCloseTo(1.0, 2);
  });

  it("is monotonically non-decreasing as stability rises (fixed D)", () => {
    const progressLow = calculateCardProgress({ difficulty: 5, stability: 1 });
    const progressMid = calculateCardProgress({ difficulty: 5, stability: 30 });
    const progressHigh = calculateCardProgress({ difficulty: 5, stability: 90 });
    expect(progressLow).toBeLessThanOrEqual(progressMid);
    expect(progressMid).toBeLessThanOrEqual(progressHigh);
  });

  it("is monotonically non-increasing as difficulty rises (fixed S)", () => {
    const progressEasy = calculateCardProgress({ difficulty: 1, stability: 30 });
    const progressMid = calculateCardProgress({ difficulty: 5, stability: 30 });
    const progressHard = calculateCardProgress({ difficulty: 10, stability: 30 });
    expect(progressEasy).toBeGreaterThanOrEqual(progressMid);
    expect(progressMid).toBeGreaterThanOrEqual(progressHard);
  });
});

const ITERATIONS = 100;

describe("Feature: fsrs-migration, Property 14: Progress Calculation Bounds", () => {
  it(`for any FSRS state (S, D), calculated progress is in [0, 1] (${ITERATIONS} iters)`, () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const D = rand(1, 10);
      const S = rand(0, 400);
      const p = calculateCardProgress({ difficulty: D, stability: S });
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
      expect(Number.isFinite(p)).toBe(true);
    }
  });

  it(`for any SM-2 state (ef, interval, reps) fallback, progress is in [0, 1] (${ITERATIONS} iters)`, () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const easeFactor = rand(1.3, 3.0);
      const interval = randInt(0, 365);
      const repetitions = randInt(0, 20);
      const p = calculateCardProgress({
        easeFactor,
        interval,
        repetitions,
      });
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
      expect(Number.isFinite(p)).toBe(true);
    }
  });

  it(`for mixed FSRS+SM-2 input, progress is always in [0, 1] (${ITERATIONS} iters)`, () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const input = {
        difficulty: Math.random() < 0.5 ? rand(1, 10) : null,
        stability: Math.random() < 0.5 ? rand(0, 400) : null,
        easeFactor: rand(1.3, 3.0),
        interval: randInt(0, 365),
        repetitions: randInt(0, 20),
      };
      const p = calculateCardProgress(input);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
      expect(Number.isFinite(p)).toBe(true);
    }
  });
});
