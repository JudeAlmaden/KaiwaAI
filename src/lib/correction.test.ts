import { describe, it, expect } from "vitest";
import { normalizeCorrection, hasFeedback } from "./types";

describe("normalizeCorrection", () => {
  it("returns null for non-objects", () => {
    expect(normalizeCorrection(null)).toBeNull();
    expect(normalizeCorrection(undefined)).toBeNull();
    expect(normalizeCorrection("nope")).toBeNull();
  });

  it("fills missing fields with empty strings and a safe status", () => {
    const c = normalizeCorrection({ status: "incorrect" });
    expect(c).toEqual({
      status: "incorrect",
      explanation: "",
      corrected: "",
      romaji: "",
      natural: "",
    });
  });

  it("falls back to 'none' for an unknown status", () => {
    expect(normalizeCorrection({ status: "weird" })?.status).toBe("none");
  });

  it("coerces non-string fields to empty strings", () => {
    const c = normalizeCorrection({
      status: "unnatural",
      explanation: 42,
      corrected: null,
    });
    expect(c?.explanation).toBe("");
    expect(c?.corrected).toBe("");
  });
});

describe("hasFeedback", () => {
  it("is false for correct/none statuses", () => {
    expect(hasFeedback(normalizeCorrection({ status: "correct" }))).toBe(false);
    expect(hasFeedback(normalizeCorrection({ status: "none" }))).toBe(false);
    expect(hasFeedback(null)).toBe(false);
  });

  it("is false when incorrect but no explanation or correction text", () => {
    expect(hasFeedback(normalizeCorrection({ status: "incorrect" }))).toBe(
      false,
    );
  });

  it("is true when incorrect/unnatural with real content", () => {
    expect(
      hasFeedback(
        normalizeCorrection({
          status: "incorrect",
          explanation: "use は not を",
          corrected: "私は眠いです。",
        }),
      ),
    ).toBe(true);
    expect(
      hasFeedback(
        normalizeCorrection({ status: "unnatural", natural: "x", corrected: "y" }),
      ),
    ).toBe(true);
  });
});
