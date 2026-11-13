import { describe, expect, it } from "vitest";
import { normalizeCardBreakdown } from "./card-breakdown-client";

describe("normalizeCardBreakdown", () => {
  const valid = {
    mnemonic: "心配 = your heart (心) wearing a worried hat",
    lookalikes: [{ jp: "心配 vs 心拍", note: "拍 is a beat, 配 is a share" }],
    examples: [{ jp: "心配しないで。", en: "Don't worry." }],
  };

  it("keeps a well-formed breakdown", () => {
    expect(normalizeCardBreakdown(valid)).toEqual(valid);
  });

  it("requires a mnemonic", () => {
    expect(normalizeCardBreakdown({ ...valid, mnemonic: "   " })).toBeNull();
    expect(normalizeCardBreakdown(null)).toBeNull();
    expect(normalizeCardBreakdown("nope")).toBeNull();
  });

  it("drops unusable lookalikes and examples", () => {
    const out = normalizeCardBreakdown({
      mnemonic: "hook",
      lookalikes: [{ jp: "待", note: "" }, null, { jp: "持", note: "hand radical" }],
      examples: [{ jp: "持つ", en: "" }, { jp: "待つ", en: "to wait" }],
    });
    expect(out).toEqual({
      mnemonic: "hook",
      lookalikes: [{ jp: "持", note: "hand radical" }],
      examples: [{ jp: "待つ", en: "to wait" }],
    });
  });

  it("caps the lists at two entries", () => {
    const out = normalizeCardBreakdown({
      mnemonic: "hook",
      lookalikes: [
        { jp: "a", note: "1" },
        { jp: "b", note: "2" },
        { jp: "c", note: "3" },
      ],
      examples: [
        { jp: "a", en: "1" },
        { jp: "b", en: "2" },
        { jp: "c", en: "3" },
      ],
    });
    expect(out?.lookalikes).toHaveLength(2);
    expect(out?.examples).toHaveLength(2);
  });

  it("treats non-array collections as empty", () => {
    const out = normalizeCardBreakdown({ mnemonic: "hook", lookalikes: "x", examples: 5 });
    expect(out).toEqual({ mnemonic: "hook", lookalikes: [], examples: [] });
  });
});
