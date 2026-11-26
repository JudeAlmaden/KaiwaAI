import { describe, it, expect } from "vitest";
import { composeSession } from "./session-composer";

describe("session-composer", () => {
  const createCard = (overrides: Partial<{
    id: string;
    repetitions: number;
    easeFactor: number;
    interval: number;
    nextReview: Date;
    createdAt: Date;
    lastReviewedAt?: Date | null;
    difficulty?: number | null;
    stability?: number | null;
    retrievability?: number | null;
  }>) => ({
    id: overrides.id ?? "card-1",
    repetitions: overrides.repetitions ?? 0,
    easeFactor: overrides.easeFactor ?? 2.5,
    interval: overrides.interval ?? 0,
    nextReview: overrides.nextReview ?? new Date(),
    createdAt: overrides.createdAt ?? new Date(),
    lastReviewedAt: overrides.lastReviewedAt ?? null,
    difficulty: overrides.difficulty ?? null,
    stability: overrides.stability ?? null,
    retrievability: overrides.retrievability ?? null,
  });

  it("should compose session with 50% active and 50% maintenance", () => {
    const now = new Date();
    const past = new Date(now.getTime() - 1000 * 60 * 60 * 24); // 1 day ago

    const cards = [
      // Active pool (new cards)
      createCard({ id: "new-1", repetitions: 0, easeFactor: 2.5, interval: 0, nextReview: now }),
      createCard({ id: "new-2", repetitions: 0, easeFactor: 2.5, interval: 0, nextReview: now }),
      createCard({ id: "new-3", repetitions: 0, easeFactor: 2.5, interval: 0, nextReview: now }),
      // Maintenance pool (due cards)
      createCard({ id: "due-1", repetitions: 5, easeFactor: 2.5, interval: 10, nextReview: past }),
      createCard({ id: "due-2", repetitions: 4, easeFactor: 2.6, interval: 15, nextReview: past }),
      createCard({ id: "due-3", repetitions: 3, easeFactor: 2.7, interval: 20, nextReview: past }),
    ];

    const { session, activeCards, maintenanceCards } = composeSession(cards, 5);

    expect(session.length).toBe(5);
    expect(activeCards.length).toBe(3); // 50% of 5 = 3
    expect(maintenanceCards.length).toBe(2); // 50% of 5 = 2

    // Active cards should only be new cards
    expect(activeCards.every(c => c.repetitions === 0)).toBe(true);

    // Maintenance cards should only be studied cards
    expect(maintenanceCards.every(c => c.repetitions > 0)).toBe(true);
  });

  it("keeps active pool limited to new cards even when struggling studied cards exist", () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24);
    const cards = [
      createCard({ id: "struggle-low", repetitions: 3, easeFactor: 1.8, interval: 2, nextReview: past }),
      createCard({ id: "struggle-high", repetitions: 3, easeFactor: 2.1, interval: 2, nextReview: past }),
      createCard({ id: "new-1", repetitions: 0, easeFactor: 2.5, interval: 0 }),
    ];

    const { activeCards, maintenanceCards } = composeSession(cards, 5);

    expect(activeCards.map(c => c.id)).toEqual(["new-1"]);
    expect(maintenanceCards.map(c => c.id)).toContain("struggle-low");
    expect(maintenanceCards.map(c => c.id)).toContain("struggle-high");
  });

  it("should exclude active cards from maintenance pool", () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24);
    
    const cards = [
      createCard({ id: "active-1", repetitions: 0, nextReview: past }),
      createCard({ id: "active-2", repetitions: 0, nextReview: past }),
      createCard({ id: "maint-1", repetitions: 5, easeFactor: 2.5, interval: 10, nextReview: past }),
      createCard({ id: "maint-2", repetitions: 5, easeFactor: 2.5, interval: 10, nextReview: past }),
    ];

    const { activeCards, maintenanceCards } = composeSession(cards, 4);

    const activeIds = activeCards.map(c => c.id);
    const maintIds = maintenanceCards.map(c => c.id);

    // No overlap
    expect(activeIds.some(id => maintIds.includes(id))).toBe(false);
  });

  it("should create pattern [A1, M1, A2, M2, M3] for 5-card session", () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24);
    
    const cards = [
      // 2 active
      createCard({ id: "A1", repetitions: 0, easeFactor: 2.0, nextReview: past }),
      createCard({ id: "A2", repetitions: 0, easeFactor: 2.1, nextReview: past }),
      // 3+ maintenance
      createCard({ id: "M1", repetitions: 5, easeFactor: 2.5, interval: 10, nextReview: past }),
      createCard({ id: "M2", repetitions: 5, easeFactor: 2.5, interval: 10, nextReview: past }),
      createCard({ id: "M3", repetitions: 5, easeFactor: 2.5, interval: 10, nextReview: past }),
    ];

    const { session, activeCards } = composeSession(cards, 5);

    expect(session.length).toBe(5);
    
    // First card should be active
    expect(activeCards.map(c => c.id).includes(session[0].id)).toBe(true);
    
    // Second active card should appear early (index 2)
    const activeIndices = session
      .map((card, idx) => activeCards.some(a => a.id === card.id) ? idx : -1)
      .filter(idx => idx !== -1);
    
    expect(activeIndices.length).toBe(2);
    expect(activeIndices[0]).toBeLessThan(3); // First active in first half
    expect(activeIndices[1]).toBeLessThan(4); // Second active before last
  });

  it("should handle edge case: all cards are active", () => {
    const cards = [
      createCard({ id: "1", repetitions: 0 }),
      createCard({ id: "2", repetitions: 0 }),
      createCard({ id: "3", repetitions: 0 }),
    ];

    const { session, activeCards, maintenanceCards } = composeSession(cards, 5);

    expect(activeCards.length).toBeGreaterThan(0);
    expect(maintenanceCards.length).toBe(0);
    expect(session.length).toBeLessThanOrEqual(3);
  });

  it("should handle edge case: no active cards", () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24);
    
    const cards = [
      createCard({ id: "1", repetitions: 5, easeFactor: 2.5, interval: 10, nextReview: past }),
      createCard({ id: "2", repetitions: 5, easeFactor: 2.5, interval: 10, nextReview: past }),
      createCard({ id: "3", repetitions: 5, easeFactor: 2.5, interval: 10, nextReview: past }),
    ];

    const { session, activeCards, maintenanceCards } = composeSession(cards, 5);

    expect(activeCards.length).toBe(0);
    expect(maintenanceCards.length).toBeGreaterThan(0);
    expect(session.length).toBeLessThanOrEqual(3);
  });

  it("should scale ratios with different session sizes", () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24);
    
    const cards = Array.from({ length: 50 }, (_, i) => 
      i < 10 
        ? createCard({ id: `active-${i}`, repetitions: 0 })
        : createCard({ id: `maint-${i}`, repetitions: 5, easeFactor: 2.5, interval: 10, nextReview: past })
    );

    const { activeCards: active10 } = composeSession(cards, 10);
    expect(active10.length).toBe(5); // 50% of 10

    const { activeCards: active20 } = composeSession(cards, 20);
    expect(active20.length).toBe(10); // 50% of 20
  });

  it("should hold back only cards reviewed moments ago from maintenance pool", () => {
    const now = new Date();
    const past = new Date(now.getTime() - 1000 * 60 * 60 * 24); // 1 day ago
    const justNow = new Date(now.getTime() - 30 * 1000); // 30 seconds ago
    const lastSession = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago

    const cards = [
      createCard({ id: "new-1", repetitions: 0, nextReview: past }),
      createCard({
        id: "just-reviewed",
        repetitions: 5,
        easeFactor: 2.5,
        interval: 10,
        nextReview: past,
        lastReviewedAt: justNow,
      }),
      createCard({
        id: "previous-session",
        repetitions: 5,
        easeFactor: 2.5,
        interval: 10,
        nextReview: past,
        lastReviewedAt: lastSession, // Finished a session 5 min ago
      }),
    ];

    const { maintenanceCards } = composeSession(cards, 5);

    // Only the card reviewed seconds ago is held back
    expect(maintenanceCards.some(c => c.id === "just-reviewed")).toBe(false);
    // A card from the previous session is available again
    expect(maintenanceCards.some(c => c.id === "previous-session")).toBe(true);
  });

  it("should include reviewed cards in a session started right after another", () => {
    const now = new Date();
    const past = new Date(now.getTime() - 1000 * 60 * 60 * 24);
    const finishedFiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // 4 new + 4 reviewed, all reviewed cards finished 5 min ago (study-ahead mode)
    const cards = [
      ...Array.from({ length: 4 }, (_, i) =>
        createCard({ id: `new-${i}`, repetitions: 0, nextReview: past })
      ),
      ...Array.from({ length: 4 }, (_, i) =>
        createCard({
          id: `maint-${i}`,
          repetitions: 5,
          easeFactor: 2.5,
          interval: 10,
          nextReview: past,
          lastReviewedAt: finishedFiveMinAgo,
        })
      ),
    ];

    const { session } = composeSession(cards, 8, true);
    const reviewed = session.filter(c => c.repetitions > 0);

    expect(reviewed.length).toBeGreaterThan(0);
    expect(session.length).toBe(8);
  });

  it("keeps weak old cards in maintenance rather than active pool", () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24);
    const cards = [
      // Weak old card — still maintenance, not active
      createCard({ id: "weak-old", repetitions: 3, easeFactor: 1.8, interval: 2, nextReview: past }),
      // New cards
      createCard({ id: "new-1", repetitions: 0, easeFactor: 2.5, interval: 0 }),
      createCard({ id: "new-2", repetitions: 0, easeFactor: 2.5, interval: 0 }),
    ];

    const { activeCards, maintenanceCards } = composeSession(cards, 8);

    expect(activeCards.length).toBe(2);
    expect(activeCards.some(c => c.id === "new-1")).toBe(true);
    expect(activeCards.some(c => c.id === "new-2")).toBe(true);
    expect(activeCards.some(c => c.id === "weak-old")).toBe(false);
    expect(maintenanceCards.some(c => c.id === "weak-old")).toBe(true);
  });

  it("should exclude active-pool cards reviewed within the last 10 minutes (cooldown)", () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24);
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);

    const cards = [
      // Brand-new card reviewed 5 min ago — excluded by 10-minute active cooldown
      createCard({
        id: "new-cooling",
        repetitions: 0,
        nextReview: past,
        lastReviewedAt: fiveMinAgo,
      }),
      // Brand-new card reviewed 15 min ago — cooldown expired
      createCard({
        id: "new-cooldown-expired",
        repetitions: 0,
        nextReview: past,
        lastReviewedAt: fifteenMinAgo,
      }),
    ];

    const { activeCards } = composeSession(cards, 10);

    expect(activeCards.some(c => c.id === "new-cooling")).toBe(false);
    expect(activeCards.some(c => c.id === "new-cooldown-expired")).toBe(true);
  });

  it("places all studied cards in maintenance regardless of difficulty or interval", () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24);
    
    const cards = [
      // New card - should be active
      createCard({ id: "new-1", repetitions: 0, easeFactor: 2.5, interval: 0 }),
      // Weak but long interval - maintenance
      createCard({ id: "weak-long", repetitions: 5, easeFactor: 1.9, interval: 7, nextReview: past }),
      // Weak AND short interval - also maintenance
      createCard({ id: "weak-short", repetitions: 3, easeFactor: 1.8, interval: 2, nextReview: past }),
    ];

    const { activeCards, maintenanceCards } = composeSession(cards, 5);

    expect(activeCards.some(c => c.id === "new-1")).toBe(true);
    expect(activeCards.some(c => c.id === "weak-short")).toBe(false);
    expect(activeCards.some(c => c.id === "weak-long")).toBe(false);
    expect(maintenanceCards.some(c => c.id === "weak-short")).toBe(true);
    expect(maintenanceCards.some(c => c.id === "weak-long")).toBe(true);
  });

  it("should support learningRatio = 0 (reviews only)", () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24);
    const cards = [
      createCard({ id: "new-1", repetitions: 0, easeFactor: 2.5, interval: 0 }),
      createCard({ id: "new-2", repetitions: 0, easeFactor: 2.5, interval: 0 }),
      createCard({ id: "due-1", repetitions: 4, easeFactor: 2.5, interval: 10, nextReview: past }),
      createCard({ id: "due-2", repetitions: 5, easeFactor: 2.5, interval: 15, nextReview: past }),
      createCard({ id: "due-3", repetitions: 6, easeFactor: 2.5, interval: 20, nextReview: past }),
      createCard({ id: "due-3", repetitions: 6, easeFactor: 2.5, interval: 20, nextReview: past }),
    ];

    const { session, activeCards } = composeSession(cards, 3, false, 0);

    expect(activeCards.length).toBe(0);
    expect(session.every(c => c.repetitions > 0)).toBe(true);
    expect(session.some(c => c.id === "new-1" || c.id === "new-2")).toBe(false);
  });

  it("should respect maxNewCards option in composeSession", () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24);
    const cards = [
      createCard({ id: "new-1", repetitions: 0, easeFactor: 2.5, interval: 0 }),
      createCard({ id: "new-2", repetitions: 0, easeFactor: 2.5, interval: 0 }),
      createCard({ id: "new-3", repetitions: 0, easeFactor: 2.5, interval: 0 }),
      createCard({ id: "struggle-1", repetitions: 2, easeFactor: 1.8, interval: 2, nextReview: past }),
      createCard({ id: "due-1", repetitions: 4, easeFactor: 2.5, interval: 10, nextReview: past }),
      createCard({ id: "due-2", repetitions: 5, easeFactor: 2.5, interval: 15, nextReview: past }),
      createCard({ id: "due-3", repetitions: 6, easeFactor: 2.5, interval: 20, nextReview: past }),
    ];

    const { session, activeCards } = composeSession(cards, 5, false, 0.5, { maxNewCards: 1 });

    expect(session.length).toBe(5);

    const newInActive = activeCards.filter(c => c.repetitions === 0);
    expect(newInActive.length).toBeLessThanOrEqual(1);
  });
});
