/**
 * Unit tests for Review "Again" re-queue grade restriction rules.
 *
 * These tests validate the pure state-machine logic for:
 *  - Disabling Good & Easy when a card was previously marked Again
 *  - Accurate pass/unlock counting including re-queued cards
 *  - Edge cases: all-fail sessions, single card, duplicate grades, max streak
 */

import { describe, it, expect } from "vitest";

type GradeState = {
  failedCardIds: Set<string>;
  passedCardIds: Set<string>;
  tally: { again: number; good: number };
};

/**
 * Simulates the grade logic from ReviewClient.tsx and app-lock/page.tsx.
 * Returns the next state and whether the grade was allowed.
 */
function processGrade(
  state: GradeState,
  cardId: string,
  grade: number
): { nextState: GradeState; allowed: boolean } {
  const isFailed = state.failedCardIds.has(cardId);

  // Good (2) and Easy (3) are disabled once card was marked Again in this session
  if (isFailed && (grade === 2 || grade === 3)) {
    return { nextState: state, allowed: false };
  }

  const nextFailed = new Set(state.failedCardIds);
  const nextPassed = new Set(state.passedCardIds);
  const nextTally = { ...state.tally };

  if (grade === 0) {
    nextFailed.add(cardId);
    // Only count again on first encounter
    if (!state.passedCardIds.has(cardId) && !state.failedCardIds.has(cardId)) {
      nextTally.again += 1;
    }
  } else if (grade > 0) {
    // Count as good only the first time card is successfully graded
    if (!nextPassed.has(cardId)) {
      nextPassed.add(cardId);
      nextTally.good += 1;
    }
  }

  return {
    nextState: { failedCardIds: nextFailed, passedCardIds: nextPassed, tally: nextTally },
    allowed: true,
  };
}

const empty = (): GradeState => ({
  failedCardIds: new Set(),
  passedCardIds: new Set(),
  tally: { again: 0, good: 0 },
});

// ── Basic Grade Rules ────────────────────────────────────────────────────────

describe("Again-lock: basic grade rules", () => {
  it("allows Again (0) on a fresh card", () => {
    const { allowed, nextState } = processGrade(empty(), "c1", 0);
    expect(allowed).toBe(true);
    expect(nextState.failedCardIds.has("c1")).toBe(true);
    expect(nextState.tally.again).toBe(1);
    expect(nextState.tally.good).toBe(0);
  });

  it("allows Hard (1) on a fresh card", () => {
    const { allowed, nextState } = processGrade(empty(), "c1", 1);
    expect(allowed).toBe(true);
    expect(nextState.passedCardIds.has("c1")).toBe(true);
    expect(nextState.tally.good).toBe(1);
  });

  it("allows Good (2) and Easy (3) on a fresh card", () => {
    const r2 = processGrade(empty(), "c1", 2);
    const r3 = processGrade(empty(), "c1", 3);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
    expect(r2.nextState.tally.good).toBe(1);
    expect(r3.nextState.tally.good).toBe(1);
  });
});

// ── Again-Lock Enforcement ───────────────────────────────────────────────────

describe("Again-lock: Good & Easy disabled after Again", () => {
  it("blocks Good (2) after card was marked Again", () => {
    let state = empty();
    state = processGrade(state, "c1", 0).nextState; // Again
    const { allowed } = processGrade(state, "c1", 2); // Good
    expect(allowed).toBe(false);
    expect(state.tally.good).toBe(0); // still 0
  });

  it("blocks Easy (3) after card was marked Again", () => {
    let state = empty();
    state = processGrade(state, "c1", 0).nextState;
    const { allowed } = processGrade(state, "c1", 3);
    expect(allowed).toBe(false);
  });

  it("still allows Again (0) on a previously failed card — user may fail again", () => {
    let state = empty();
    state = processGrade(state, "c1", 0).nextState;
    const { allowed } = processGrade(state, "c1", 0);
    expect(allowed).toBe(true);
  });

  it("still allows Hard (1) on a previously failed card — minimal pass", () => {
    let state = empty();
    state = processGrade(state, "c1", 0).nextState;
    const { allowed, nextState } = processGrade(state, "c1", 1);
    expect(allowed).toBe(true);
    expect(nextState.passedCardIds.has("c1")).toBe(true);
  });

  it("does NOT retroactively disable Good/Easy for OTHER cards after one fails", () => {
    let state = empty();
    state = processGrade(state, "c1", 0).nextState; // c1 fails
    const { allowed } = processGrade(state, "c2", 2); // c2 is untouched
    expect(allowed).toBe(true);
  });
});

// ── Completion Counting ──────────────────────────────────────────────────────

describe("Again-lock: completion counting with re-queued cards", () => {
  it("re-queued card that eventually passes increments count exactly once", () => {
    let state = empty();
    state = processGrade(state, "c1", 0).nextState; // fail
    state = processGrade(state, "c1", 0).nextState; // fail again (allowed — Again is always allowed)
    state = processGrade(state, "c1", 1).nextState; // finally pass with Hard
    expect(state.tally.good).toBe(1);
    expect(state.passedCardIds.size).toBe(1);
  });

  it("passing the same card twice does not double-count", () => {
    let state = empty();
    state = processGrade(state, "c1", 2).nextState; // Good first time
    state = processGrade(state, "c1", 2).nextState; // Good second time (re-seen card)
    expect(state.tally.good).toBe(1);
  });

  it("session unlock fires when required unique cards are passed", () => {
    const required = 3;
    let state = empty();

    // c1 fails then passes via Hard
    state = processGrade(state, "c1", 0).nextState;
    state = processGrade(state, "c1", 1).nextState;
    // c2 passes directly
    state = processGrade(state, "c2", 2).nextState;
    // c3 passes directly
    state = processGrade(state, "c3", 3).nextState;

    expect(state.passedCardIds.size).toBe(required);
  });

  it("session does NOT unlock if re-queued card never gets re-attempted", () => {
    const required = 3;
    let state = empty();

    state = processGrade(state, "c1", 2).nextState;
    state = processGrade(state, "c2", 0).nextState; // c2 fails, not re-attempted
    state = processGrade(state, "c3", 2).nextState;

    // Only 2 unique passes → below threshold
    expect(state.passedCardIds.size).toBe(2);
    expect(state.passedCardIds.size < required).toBe(true);
  });
});

// ── Edge Cases ───────────────────────────────────────────────────────────────

describe("Again-lock: edge cases", () => {
  it("single-card session: fails then passes → 1 good", () => {
    let state = empty();
    state = processGrade(state, "solo", 0).nextState;
    const { allowed, nextState } = processGrade(state, "solo", 1);
    expect(allowed).toBe(true);
    expect(nextState.tally.good).toBe(1);
    expect(nextState.tally.again).toBe(1);
  });

  it("all-fail session: no card ever passes → completedCount stays 0", () => {
    let state = empty();
    const cards = ["c1", "c2", "c3"];
    for (const card of cards) {
      state = processGrade(state, card, 0).nextState;
    }
    expect(state.passedCardIds.size).toBe(0);
    expect(state.tally.good).toBe(0);
  });

  it("mixed session: 50% fail, 50% pass → exact count", () => {
    let state = empty();
    state = processGrade(state, "c1", 2).nextState; // pass
    state = processGrade(state, "c2", 0).nextState; // fail
    state = processGrade(state, "c3", 3).nextState; // pass
    state = processGrade(state, "c4", 0).nextState; // fail
    expect(state.passedCardIds.size).toBe(2);
    expect(state.failedCardIds.size).toBe(2);
  });

  it("perfect score: all Good → tally.again stays 0", () => {
    let state = empty();
    for (const id of ["c1", "c2", "c3", "c4", "c5"]) {
      state = processGrade(state, id, 2).nextState;
    }
    expect(state.tally.again).toBe(0);
    expect(state.tally.good).toBe(5);
  });

  it("new session resets failed state — cards from previous session do not carry over", () => {
    // Simulates new session start (state is reset)
    const sessionA = processGrade(empty(), "c1", 0).nextState;
    expect(sessionA.failedCardIds.has("c1")).toBe(true);

    // New session — fresh state
    const sessionB = empty();
    const { allowed } = processGrade(sessionB, "c1", 2); // c1 Good is allowed again
    expect(allowed).toBe(true);
  });
});
