import { describe, expect, it } from "vitest";
import type { BlockerStudyMode } from "@/plugins/app-blocker/definitions";
import { CUSTOM_PLAN_ID, SESSION_PLANS, resolvePlan } from "./session-plan";
import { composeSession } from "../session-composer";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();

const reviewed = (id: string) => ({
  id,
  repetitions: 2,
  timesReviewed: 2,
  easeFactor: 2.5,
  interval: 5,
  nextReview: new Date(NOW - DAY),
  createdAt: new Date(NOW - 30 * DAY),
  lastReviewedAt: new Date(NOW - 3 * DAY),
});

const fresh = (id: string) => ({
  id,
  repetitions: 0,
  timesReviewed: 0,
  easeFactor: 2.5,
  interval: 0,
  nextReview: new Date(NOW),
  createdAt: new Date(NOW),
  lastReviewedAt: null,
});

/** Enough of both kinds that neither pool is the limiting factor. */
const CARDS = [
  ...Array.from({ length: 24 }, (_, i) => reviewed(`r${i}`)),
  ...Array.from({ length: 24 }, (_, i) => fresh(`n${i}`)),
];

describe("resolvePlan — named plans round-trip", () => {
  for (const plan of SESSION_PLANS) {
    it(`${plan.label} → ${plan.id}`, () => {
      expect(resolvePlan(plan.studyMode, plan.learningRatio)).toBe(plan.id);
    });
  }
});

describe("resolvePlan — legacy and hand-tuned configs", () => {
  const cases: {
    studyMode: BlockerStudyMode;
    ratio?: number;
    expected: string;
  }[] = [
    { studyMode: "due", ratio: 0, expected: "reviews-only" },
    { studyMode: "due", ratio: 0.2, expected: "casual-drip" },
    { studyMode: "due", ratio: 0.5, expected: "active-intake" },
    { studyMode: "due", ratio: 1, expected: "all-new" },
    // Missing ratio falls back to the composer's 0.5 default.
    { studyMode: "due", expected: "active-intake" },
    // Study ahead and Weak cards are gone: their old configs stay editable as
    // a custom mix (study-ahead only happens as the composer's last resort).
    { studyMode: "all", ratio: 0.5, expected: CUSTOM_PLAN_ID },
    { studyMode: "all", expected: CUSTOM_PLAN_ID },
    // Ratio is inert on this pool, so any value is the same session.
    { studyMode: "struggling", ratio: 0, expected: CUSTOM_PLAN_ID },
    { studyMode: "struggling", ratio: 0.5, expected: CUSTOM_PLAN_ID },
    { studyMode: "leeches", ratio: 1, expected: "trouble-spots" },
    // Genuinely hand-tuned combinations keep their settings via "custom".
    { studyMode: "due", ratio: 0.7, expected: CUSTOM_PLAN_ID },
    { studyMode: "all", ratio: 0, expected: CUSTOM_PLAN_ID },
    { studyMode: "all", ratio: 1, expected: CUSTOM_PLAN_ID },
    { studyMode: "recent", ratio: 0.5, expected: CUSTOM_PLAN_ID },
    // Just outside the plan's tolerance window.
    { studyMode: "due", ratio: 0.45, expected: CUSTOM_PLAN_ID },
  ];

  for (const { studyMode, ratio, expected } of cases) {
    it(`${studyMode} @ ${ratio ?? "—"} → ${expected}`, () => {
      expect(resolvePlan(studyMode, ratio)).toBe(expected);
    });
  }
});

describe("session plans → composer split", () => {
  const expected: Record<string, { active: number; maintenance: number }> = {
    "reviews-only": { active: 0, maintenance: 10 },
    "casual-drip": { active: 2, maintenance: 8 },
    "active-intake": { active: 5, maintenance: 5 },
    "all-new": { active: 10, maintenance: 0 },
  };

  for (const plan of SESSION_PLANS) {
    const want = expected[plan.id];
    if (!want) continue; // weak/leeches review routes bypass the composer.

    it(`${plan.label} at 10 cards → ${want.active}/${want.maintenance}`, () => {
      const { activeCards, maintenanceCards, session } = composeSession(
        CARDS,
        10,
        plan.studyMode === "all",
        plan.learningRatio
      );
      expect(activeCards).toHaveLength(want.active);
      expect(maintenanceCards).toHaveLength(want.maintenance);
      expect(session).toHaveLength(10);
    });
  }

  it("due-reviews serves no brand-new cards", () => {
    const { session } = composeSession(CARDS, 10, false, 0);
    expect(session.every((card) => card.timesReviewed > 0)).toBe(true);
  });

  it("due-new includes brand-new cards in the active half", () => {
    const { activeCards } = composeSession(CARDS, 10, false, 0.5);
    expect(activeCards.every((card) => card.timesReviewed === 0)).toBe(true);
  });
});
