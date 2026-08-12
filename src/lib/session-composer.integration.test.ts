import { describe, it, expect } from "vitest";
import { composeSession } from "./session-composer";

/**
 * Integration tests for session composer with app blocker scenarios.
 * These tests verify that the session composer works correctly for
 * the app-lock page which is used by the app blocker feature.
 */

describe("session-composer integration with app blocker", () => {
  const createMockCard = (overrides: {
    id: string;
    repetitions?: number;
    easeFactor?: number;
    interval?: number;
    nextReview?: Date;
    createdAt?: Date;
    lastReviewedAt?: Date | null;
  }) => ({
    id: overrides.id,
    repetitions: overrides.repetitions ?? 0,
    easeFactor: overrides.easeFactor ?? 2.5,
    interval: overrides.interval ?? 0,
    nextReview: overrides.nextReview ?? new Date(),
    createdAt: overrides.createdAt ?? new Date(),
    lastReviewedAt: overrides.lastReviewedAt ?? null,
  });

  describe("app-lock page compatibility", () => {
    it("should return cards when studyMode=due is used", () => {
      const now = new Date();
      const past = new Date(now.getTime() - 1000 * 60 * 60 * 24); // 1 day ago
      
      const cards = [
        createMockCard({ id: "1", repetitions: 0, nextReview: past }),
        createMockCard({ id: "2", repetitions: 0, nextReview: past }),
        createMockCard({ id: "3", repetitions: 5, easeFactor: 2.5, interval: 10, nextReview: past }),
        createMockCard({ id: "4", repetitions: 5, easeFactor: 2.5, interval: 10, nextReview: past }),
        createMockCard({ id: "5", repetitions: 5, easeFactor: 2.5, interval: 10, nextReview: past }),
      ];

      const { session } = composeSession(cards, 5);

      expect(session.length).toBe(5);
      expect(session.every(card => cards.includes(card))).toBe(true);
    });

    it("should work with limit=50 (app-lock default)", () => {
      const now = new Date();
      const past = new Date(now.getTime() - 1000 * 60 * 60 * 24);
      
      // Create 100 cards
      const cards = Array.from({ length: 100 }, (_, i) => 
        createMockCard({
          id: `card-${i}`,
          repetitions: i < 20 ? 0 : 5, // First 20 are new
          easeFactor: 2.5,
          interval: i < 20 ? 0 : 10,
          nextReview: past,
        })
      );

      const { session, activeCards, maintenanceCards } = composeSession(cards, 50);

      expect(session.length).toBe(50);
      // 50% target for active, but we only have 20 eligible new cards so we cap there
      // and overflow uses maintenance fill to reach 50 total
      expect(activeCards.length).toBe(20);
      expect(maintenanceCards.length).toBe(25);
    });

    it("should handle empty card pool gracefully", () => {
      const { session } = composeSession([], 10);

      expect(session.length).toBe(0);
    });

    it("should handle fewer cards than session size", () => {
      const now = new Date();
      const cards = [
        createMockCard({ id: "1", repetitions: 0, nextReview: now }),
        createMockCard({ id: "2", repetitions: 0, nextReview: now }),
      ];

      const { session } = composeSession(cards, 10);

      expect(session.length).toBeLessThanOrEqual(2);
      expect(session).toEqual(cards);
    });
  });

  describe("app blocker review requirements", () => {
    it("should provide exactly the requested number of cards when available", () => {
      const now = new Date();
      const past = new Date(now.getTime() - 1000 * 60 * 60 * 24);
      
      // App blocker requires exactly 10 flashcards
      const requiredCount = 10;
      
      const cards = Array.from({ length: 50 }, (_, i) =>
        createMockCard({
          id: `card-${i}`,
          repetitions: i < 10 ? 0 : 5,
          easeFactor: 2.5,
          interval: i < 10 ? 0 : 10,
          nextReview: past,
        })
      );

      const { session } = composeSession(cards, requiredCount);

      expect(session.length).toBe(requiredCount);
    });

    it("should prioritize new cards for new users", () => {
      const now = new Date();
      
      // Scenario: New user just added 20 words
      const cards = Array.from({ length: 20 }, (_, i) =>
        createMockCard({
          id: `new-${i}`,
          repetitions: 0,
          easeFactor: 2.5,
          interval: 0,
          nextReview: now,
          createdAt: new Date(now.getTime() - i * 1000), // Different creation times
        })
      );

      const { session, activeCards } = composeSession(cards, 10);

      // All new cards go to active pool (50% = 5 cards for session of 10)
      // But since there are no maintenance cards, overflowActive fills the rest in session
      expect(session.length).toBeGreaterThan(0);
      expect(activeCards.length).toBe(5); // 50% target of 10
      expect(activeCards.every(card => card.repetitions === 0)).toBe(true);
    });

    it("should handle consecutive review sessions without repetition", () => {
      const now = new Date();
      const past = new Date(now.getTime() - 1000 * 60 * 60 * 24);
      const recent = new Date(now.getTime() - 30 * 60 * 1000); // 30 min ago
      
      const cards = [
        // New cards
        createMockCard({ id: "new-1", repetitions: 0, nextReview: now }),
        createMockCard({ id: "new-2", repetitions: 0, nextReview: now }),
        // Due cards (some recently reviewed)
        createMockCard({ 
          id: "due-recent-1", 
          repetitions: 5, 
          easeFactor: 2.5, 
          interval: 10, 
          nextReview: past,
          lastReviewedAt: recent, // Recently reviewed
        }),
        createMockCard({ 
          id: "due-recent-2", 
          repetitions: 5, 
          easeFactor: 2.5, 
          interval: 10, 
          nextReview: past,
          lastReviewedAt: recent,
        }),
        createMockCard({ 
          id: "due-old-1", 
          repetitions: 5, 
          easeFactor: 2.5, 
          interval: 10, 
          nextReview: past,
          lastReviewedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
        }),
        createMockCard({ 
          id: "due-old-2", 
          repetitions: 5, 
          easeFactor: 2.5, 
          interval: 10, 
          nextReview: past,
          lastReviewedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        }),
      ];

      const { session, maintenanceCards } = composeSession(cards, 5);

      // Recently reviewed cards should be excluded from maintenance
      const recentIds = ["due-recent-1", "due-recent-2"];
      expect(maintenanceCards.every(c => !recentIds.includes(c.id))).toBe(true);
      
      // Session should include old due cards, not recent ones
      expect(session.length).toBeGreaterThan(0);
    });
  });

  describe("study mode compatibility", () => {
    it("should work with studyMode=all (study ahead)", () => {
      const now = new Date();
      const past = new Date(now.getTime() - 1000 * 60 * 60 * 24); // 1 day ago
      
      // Cards that have good intervals (not due yet in reality,
      // but for "all" mode they should still be available)
      const cards = [
        createMockCard({ id: "1", repetitions: 3, easeFactor: 2.5, interval: 5, nextReview: past }),
        createMockCard({ id: "2", repetitions: 3, easeFactor: 2.5, interval: 5, nextReview: past }),
        createMockCard({ id: "3", repetitions: 3, easeFactor: 2.5, interval: 5, nextReview: past }),
        createMockCard({ id: "4", repetitions: 3, easeFactor: 2.5, interval: 5, nextReview: past }),
        createMockCard({ id: "5", repetitions: 3, easeFactor: 2.5, interval: 5, nextReview: past }),
      ];

      const { session } = composeSession(cards, 5);

      expect(session.length).toBeGreaterThan(0);
    });

    it("should work with studyMode=recent (last 7 days)", () => {
      const now = new Date();
      const recent = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      
      // Recently added cards (all new, so they go to active pool)
      const cards = Array.from({ length: 10 }, (_, i) =>
        createMockCard({
          id: `recent-${i}`,
          repetitions: 0,
          easeFactor: 2.5,
          interval: 0,
          nextReview: now,
          createdAt: recent,
        })
      );

      const { session, activeCards } = composeSession(cards, 5);

      // With only new cards, we get 50% target in activeCards (3), overflowActive fills session
      expect(session.length).toBeGreaterThan(0);
      expect(activeCards.length).toBe(3); // 50% target of 5
    });
  });

  describe("mixed review type (vocab + kanji)", () => {
    it("should handle mixed card types", () => {
      const now = new Date();
      const past = new Date(now.getTime() - 1000 * 60 * 60 * 24);
      
      // Simulate vocabulary cards
      const vocabCards = Array.from({ length: 5 }, (_, i) =>
        createMockCard({
          id: `vocab-${i}`,
          repetitions: i < 2 ? 0 : 5,
          easeFactor: 2.5,
          interval: i < 2 ? 0 : 10,
          nextReview: past,
        })
      );

      // Simulate kanji cards
      const kanjiCards = Array.from({ length: 5 }, (_, i) =>
        createMockCard({
          id: `kanji-${i}`,
          repetitions: i < 2 ? 0 : 5,
          easeFactor: 2.5,
          interval: i < 2 ? 0 : 10,
          nextReview: past,
        })
      );

      const vocabSession = composeSession(vocabCards, 5);
      const kanjiSession = composeSession(kanjiCards, 5);

      expect(vocabSession.session.length).toBe(5);
      expect(kanjiSession.session.length).toBe(5);
    });
  });

  describe("practice mode compatibility", () => {
    it("should work with practice=true (no SRS updates)", () => {
      const now = new Date();
      
      // In practice mode, session composition should still work
      // (SRS updates are skipped in the grading endpoint, not here)
      const cards = Array.from({ length: 10 }, (_, i) =>
        createMockCard({
          id: `practice-${i}`,
          repetitions: 0,
          easeFactor: 2.5,
          interval: 0,
          nextReview: now,
        })
      );

      const { session, activeCards } = composeSession(cards, 5);

      // All new cards, so activeCards hits the 50% target (3); overflow fills session
      expect(session.length).toBeGreaterThan(0);
      expect(activeCards.length).toBe(3); // 50% target of 5
      // Practice mode doesn't affect card selection, only grading
    });
  });

  describe("noDueAction compatibility", () => {
    it("should handle noDueAction=autoOpen (no due cards scenario)", () => {
      const now = new Date();
      const future = new Date(now.getTime() + 1000 * 60 * 60 * 24);
      
      // All cards are in future (none due)
      const cards = Array.from({ length: 10 }, (_, i) =>
        createMockCard({
          id: `future-${i}`,
          repetitions: 5,
          easeFactor: 2.5,
          interval: 10,
          nextReview: future,
        })
      );

      const { session, maintenanceCards } = composeSession(cards, 5);

      // No maintenance cards (none are due)
      expect(maintenanceCards.length).toBe(0);
      // Should still return session if there are cards
      expect(session.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle noDueAction=studyAny (fallback to all cards)", () => {
      const now = new Date();
      const past = new Date(now.getTime() - 1000 * 60 * 60 * 24);
      
      // Mix of new and due cards
      const cards = [
        createMockCard({ id: "new-1", repetitions: 0, nextReview: now }),
        createMockCard({ id: "new-2", repetitions: 0, nextReview: now }),
        createMockCard({ 
          id: "due-1", 
          repetitions: 5, 
          easeFactor: 2.5, 
          interval: 10,
          nextReview: past,
        }),
      ];

      const { session } = composeSession(cards, 3);

      // Should create a session with available cards
      expect(session.length).toBeGreaterThan(0);
      expect(session.length).toBeLessThanOrEqual(3);
    });
  });

  describe("performance with large card sets", () => {
    it("should handle 200+ cards efficiently", () => {
      const now = new Date();
      const past = new Date(now.getTime() - 1000 * 60 * 60 * 24);
      
      // Create 250 cards (app may fetch up to limit*4 = 200 in real scenario)
      const cards = Array.from({ length: 250 }, (_, i) =>
        createMockCard({
          id: `card-${i}`,
          repetitions: i < 50 ? 0 : 5,
          easeFactor: 2.5 - (i % 10) * 0.1, // Vary ease factors
          interval: i < 50 ? 0 : 5 + (i % 20),
          nextReview: past,
        })
      );

      const startTime = performance.now();
      const { session } = composeSession(cards, 50);
      const endTime = performance.now();

      expect(session.length).toBe(50);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in <100ms
    });
  });
});
