import { describe, expect, it } from "vitest";
import { createScheduler } from "./scheduler";

/**
 * The difficulty update used `gradeAdjusted - 4` on a 1-based grade instead of
 * `- 3`, so every grade was one step harsher: Good (+0.86 instead of 0) and
 * Easy (0 instead of -0.86). Difficulty ratcheted to 10 and pinned there, which
 * cut the stability growth term (11 - D) from ~6 to 1 and made well-known cards
 * reschedule far too slowly.
 */
describe("FSRS difficulty update", () => {
  it("does not raise difficulty on a Good review", () => {
    const after = createScheduler().schedule(
      { difficulty: 4.93, stability: 5, retrievability: 0.9 },
      2
    );
    expect(after.difficulty).toBeLessThanOrEqual(4.93);
  });

  it("raises difficulty on Again and lowers it on Easy", () => {
    const scheduler = createScheduler();
    const base = { difficulty: 5, stability: 5, retrievability: 0.9 };
    expect(scheduler.schedule(base, 0).difficulty).toBeGreaterThan(5);
    expect(scheduler.schedule(base, 3).difficulty).toBeLessThan(5);
  });

  it("keeps difficulty near its initial value and lets the interval compound over ten Goods", () => {
    const scheduler = createScheduler();
    let state = scheduler.initializeCard(2);
    let interval = Math.max(1, Math.min(3650, Math.round(state.stability)));

    for (let i = 0; i < 10; i++) {
      const retrievability = Math.max(
        0,
        Math.min(1, Math.pow(1 + interval / (9 * Math.max(state.stability, 0.1)), -1))
      );
      const result = scheduler.schedule({ ...state, retrievability }, 2, {
        desiredRetention: 0.9,
      });
      state = {
        difficulty: result.difficulty,
        stability: result.stability,
        retrievability: result.retrievability,
      };
      interval = Math.max(1, Math.min(3650, Math.round(state.stability)));
    }

    expect(state.difficulty).toBeLessThan(6);
    expect(interval).toBeGreaterThan(300);
  });
});
