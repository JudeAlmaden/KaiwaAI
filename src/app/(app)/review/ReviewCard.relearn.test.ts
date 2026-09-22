import { describe, it, expect } from "vitest";
import { disabledGradesForRelearn, RELEARN_DISABLED_GRADES } from "./ReviewCard";

describe("disabledGradesForRelearn", () => {
  it("allows all grades on first attempt", () => {
    expect(disabledGradesForRelearn(false)).toEqual([]);
  });

  it("disables Good and Easy after Again requeue", () => {
    expect(disabledGradesForRelearn(true)).toEqual([...RELEARN_DISABLED_GRADES]);
    expect(disabledGradesForRelearn(true)).toEqual([2, 3]);
  });
});
