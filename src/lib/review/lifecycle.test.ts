import { describe, expect, it } from "vitest";
import {
  GRADUATED_INTERVAL_DAYS,
  cardStatus,
  isGraduated,
  isLearningCard,
  isNewCard,
} from "./lifecycle";

describe("card lifecycle", () => {
  it("treats never-graded cards as new", () => {
    expect(isNewCard({ repetitions: 0, interval: 0 })).toBe(true);
    expect(isNewCard({})).toBe(true);
    expect(isNewCard({ repetitions: 1, interval: 1 })).toBe(false);
  });

  it("graduates based on interval alone regardless of repetitions", () => {
    expect(isGraduated({ repetitions: 1, interval: GRADUATED_INTERVAL_DAYS })).toBe(true);
    expect(isGraduated({ repetitions: 2, interval: 40 })).toBe(true);
    expect(isGraduated({ repetitions: 9, interval: 20 })).toBe(false);
    expect(isGraduated({ repetitions: 0, interval: 0 })).toBe(false);
  });

  it("counts graded-but-not-graduated cards as learning", () => {
    expect(isLearningCard({ repetitions: 1, interval: 1 })).toBe(true);
    expect(isLearningCard({ repetitions: 9, interval: 20 })).toBe(true);
    expect(isLearningCard({ repetitions: 0, interval: 0 })).toBe(false);
    expect(isLearningCard({ repetitions: 3, interval: 21 })).toBe(false);
    expect(isLearningCard({ repetitions: 2, interval: 40 })).toBe(false);
  });

  it("derives the stored status string from the same rule", () => {
    expect(cardStatus({ repetitions: 0, interval: 0 })).toBe("learning");
    expect(cardStatus({ repetitions: 2, interval: 6 })).toBe("learning");
    expect(cardStatus({ repetitions: 3, interval: 21 })).toBe("known");
  });
});
