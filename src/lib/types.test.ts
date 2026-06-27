import { describe, it, expect } from "vitest";
import { charLength, isLexical } from "./types";

describe("types helpers", () => {
  it("counts code points, not UTF-16 units", () => {
    expect(charLength("ねむい")).toBe(3);
    expect(charLength("食べる")).toBe(3);
    // emoji outside the BMP counts as 1
    expect(charLength("🍣")).toBe(1);
  });

  it("treats content words as lexical (saveable)", () => {
    expect(isLexical("verb")).toBe(true);
    expect(isLexical("noun")).toBe(true);
    expect(isLexical("adjective")).toBe(true);
  });

  it("treats particles and pronouns as non-lexical (not saveable)", () => {
    expect(isLexical("particle")).toBe(false);
    expect(isLexical("pronoun")).toBe(false);
    expect(isLexical("other")).toBe(false);
  });
});
