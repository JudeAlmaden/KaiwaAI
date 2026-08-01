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
  }>) => ({
    id: overrides.id ?? "card-1",
    repetitions: overrides.repetitions ?? 0,
    easeFactor: overrides.easeFactor ?? 2.5,
    interval: overrides.interval ?? 0,
    nextReview: overrides.nextReview ?? new Date(),
    createdAt: overrides.createdAt ?? new Date(),
    lastReviewedAt: overrides.lastReviewedAt ?? null,
  });

  it("should compose session with 40% active and 60% maintenance", () => {
    const now = new Date();
    const past = new Date(now.getTime() - 1000 * 60 * 60 * 24); // 1 day ago

    const cards = [
      // Active pool (new cards)
      createCard({ id: "new-1", repetitions: 0, easeFactor: 2.5, interval: 0, nextReview: now }),
      createCard({ id: "new-2", repetitions: 0, easeFactor: 2.5, interval: 0, nextReview: now }),
      // Active pool (struggling cards)
      createCard({ id: "struggle-1", repetitions: 2, easeFactor: 2.0, interval: 5, nextReview: past }),
      // Maintenance pool (due cards)
      createCard({ id: "due-1", repetitions: 5, easeFactor: 2.5, interval: 10, nextReview: past }),
      createCard({ id: "due-2", repetitions: 4, easeFactor: 2.6, interval: 15, nextReview: past }),
      createCard({ id: "due-3", repetitions: 3, easeFactor: 2.7, interval: 20, nextReview: past }),
    ];

    const { session, activeCards, maintenanceCards } = composeSession(cards, 5);

    expect(session.length).toBe(5);
    expect(activeCards.length).toBe(2); // 40% of 5 = 2
    expect(maintenanceCards.length).toBe(3); // 60% of 5 = 3

    // Active cards should be in the active pool
    expect(activeCards.every(c => 
      c.repetitions === 0 || (c.easeFactor < 2.2 && c.interval < 3)
    )).toBe(true);

    // Maintenance cards should NOT be in active pool
    expect(maintenanceCards.every(c => 
      !(c.repetitions === 0 || (c.easeFactor < 2.2 && c.interval < 3))
    )).toBe(true);
  });

  it("should prioritize struggling cards in active pool", () => {
    const now = new Date();
    
    // Cards should be pre-sorted by caller (easeFactor, repetitions, createdAt)
    const cards = [
      createCard({ id: "struggle-low", repetitions: 3, easeFactor: 1.8, interval: 2 }),
      createCard({ id: "struggle-high", repetitions: 3, easeFactor: 2.1, interval: 2 }),
      createCard({ id: "new-1", repetitions: 0, easeFactor: 2.5, interval: 0 }),
    ];

    const { activeCards } = composeSession(cards, 5);

    // Lower ease factor should come first (already sorted by caller)
    expect(activeCards[0].id).toBe("struggle-low");
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
    expect(active10.length).toBe(4); // 40% of 10

    const { activeCards: active20 } = composeSession(cards, 20);
    expect(active20.length).toBe(8); // 40% of 20
  });

  it("should exclude recently reviewed cards from maintenance pool", () => {
    const now = new Date();
    const past = new Date(now.getTime() - 1000 * 60 * 60 * 24); // 1 day ago
    const recent = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago
    const longAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
    
    const cards = [
      createCard({ id: "new-1", repetitions: 0, nextReview: past }),
      createCard({ 
        id: "recent-review", 
        repetitions: 5, 
        easeFactor: 2.5, 
        interval: 10, 
        nextReview: past,
        lastReviewedAt: recent, // Reviewed 30 min ago
      }),
      createCard({ 
        id: "old-review", 
        repetitions: 5, 
        easeFactor: 2.5, 
        interval: 10, 
        nextReview: past,
        lastReviewedAt: longAgo, // Reviewed 2 hours ago
      }),
    ];

    const { maintenanceCards } = composeSession(cards, 5);

    // Should NOT include recently reviewed card
    expect(maintenanceCards.some(c => c.id === "recent-review")).toBe(false);
    // Should include card reviewed >1 hour ago
    expect(maintenanceCards.some(c => c.id === "old-review")).toBe(true);
  });

  it("should prioritize new cards over weak old cards in active pool", () => {
    const cards = [
      // Weak old card that meets BOTH criteria (ease < 2.2 AND interval < 3)
      createCard({ id: "weak-old", repetitions: 3, easeFactor: 1.8, interval: 2 }),
      // New cards
      createCard({ id: "new-1", repetitions: 0, easeFactor: 2.5, interval: 0 }),
      createCard({ id: "new-2", repetitions: 0, easeFactor: 2.5, interval: 0 }),
    ];

    // Use larger session size to get all 3 active cards
    const { activeCards } = composeSession(cards, 8);

    // All three should be in active pool (40% of 8 = 3)
    expect(activeCards.length).toBe(3);
    
    // New cards should be included (repetitions = 0)
    expect(activeCards.some(c => c.id === "new-1")).toBe(true);
    expect(activeCards.some(c => c.id === "new-2")).toBe(true);
    // Weak old card meets both criteria
    expect(activeCards.some(c => c.id === "weak-old")).toBe(true);
  });

  it("should exclude old weak cards with longer intervals from active pool", () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24);
    
    const cards = [
      // New card - should be active
      createCard({ id: "new-1", repetitions: 0, easeFactor: 2.5, interval: 0 }),
      // Weak but long interval - should NOT be active
      createCard({ id: "weak-long", repetitions: 5, easeFactor: 1.9, interval: 7, nextReview: past }),
      // Weak AND short interval - should be active
      createCard({ id: "weak-short", repetitions: 3, easeFactor: 1.8, interval: 2, nextReview: past }),
    ];

    const { activeCards, maintenanceCards } = composeSession(cards, 5);

    // New and weak-short should be active
    expect(activeCards.some(c => c.id === "new-1")).toBe(true);
    expect(activeCards.some(c => c.id === "weak-short")).toBe(true);
    
    // Weak-long should be in maintenance
    expect(activeCards.some(c => c.id === "weak-long")).toBe(false);
    expect(maintenanceCards.some(c => c.id === "weak-long")).toBe(true);
  });
});
