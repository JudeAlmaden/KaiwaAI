import { describe, it, expect } from "vitest";
import { FALLBACK_OFFLINE_CARDS, FALLBACK_OFFLINE_KANJI_CARDS } from "./fallback-cards";
import { GRADES } from "@/app/(app)/review/ReviewCard";

describe("fallback-cards", () => {
  it("provides vocabulary fallback cards with valid structure", () => {
    expect(FALLBACK_OFFLINE_CARDS.length).toBeGreaterThan(0);
    for (const card of FALLBACK_OFFLINE_CARDS) {
      expect(card.type).toBe("vocabulary");
      expect(card.word).toBeDefined();
      expect(card.reading).toBeDefined();
      expect(card.meaning).toBeDefined();
    }
  });

  it("provides kanji fallback cards with valid structure and RTK fields", () => {
    expect(FALLBACK_OFFLINE_KANJI_CARDS.length).toBeGreaterThan(0);
    for (const card of FALLBACK_OFFLINE_KANJI_CARDS) {
      expect(card.type).toBe("kanji");
      expect(card.character).toBeDefined();
      expect(card.meanings).toBeInstanceOf(Array);
      expect(card.heisigNumber).toBeGreaterThan(0);
      expect(card.heisigLesson).toBeGreaterThan(0);
      expect(card.heisigKeyword).toBeDefined();
    }
  });
});

describe("ReviewCard GRADES", () => {
  it("defines standard 4-point SRS grades", () => {
    expect(GRADES.map((g) => g.grade)).toEqual([0, 1, 2, 3]);
    expect(GRADES.map((g) => g.label)).toEqual(["Again", "Hard", "Good", "Easy"]);
  });
});
