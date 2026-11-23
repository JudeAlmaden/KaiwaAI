import { describe, it, expect } from "vitest";
import { buildComponentContexts, mergeComponents, safeJsonArray } from "./context";
import type { ComponentRow, UserComponentOverride } from "./types";

const row = (over: Partial<ComponentRow> & { character: string }): ComponentRow => ({
  heisigKeyword: null,
  heisigNumber: null,
  meanings: "[]",
  ...over,
});

const override = (
  character: string,
  over: Partial<UserComponentOverride> = {}
): UserComponentOverride => ({
  kanji: { character },
  customMeaning: null,
  mnemonic: null,
  ...over,
});

describe("safeJsonArray", () => {
  it("returns an empty array for malformed JSON", () => {
    expect(safeJsonArray('["一",')).toEqual([]);
  });

  it("returns an empty array when the JSON is not an array", () => {
    expect(safeJsonArray('{"character":"一"}')).toEqual([]);
  });

  it("returns an empty array for null and undefined", () => {
    expect(safeJsonArray(null)).toEqual([]);
    expect(safeJsonArray(undefined)).toEqual([]);
  });

  it("parses a JSON array", () => {
    expect(safeJsonArray('["亠","八"]')).toEqual(["亠", "八"]);
  });
});

describe("buildComponentContexts", () => {
  it("keeps the authored buildup order and resolves dictionary keywords", () => {
    const rows = [
      row({
        character: "八",
        heisigKeyword: "eight",
        heisigNumber: 42,
        meanings: '["eight","eight (numeral)"]',
      }),
    ];

    const result = buildComponentContexts(["八", "亠"], rows, []);

    expect(result.map((c) => c.glyph)).toEqual(["八", "亠"]);
    expect(result[0]).toMatchObject({
      glyph: "八",
      keyword: "eight",
      heisigNumber: 42,
      inDictionary: true,
      meanings: ["eight", "eight (numeral)"],
    });
    expect(result[1]).toMatchObject({
      glyph: "亠",
      keyword: null,
      heisigNumber: null,
      inDictionary: false,
      meanings: [],
    });
  });

  it("prefers the user's custom meaning over the shared keyword", () => {
    const rows = [row({ character: "八", heisigKeyword: "eight", heisigNumber: 42 })];

    const result = buildComponentContexts(["八"], rows, [
      override("八", { customMeaning: "two legs" }),
    ]);

    expect(result[0].keyword).toBe("two legs");
  });

  it("carries the user's own story for continuity", () => {
    const rows = [row({ character: "八", heisigKeyword: "eight" })];

    const result = buildComponentContexts(["八"], rows, [
      override("八", { mnemonic: "Two legs spread apart." }),
    ]);

    expect(result[0].userMnemonic).toBe("Two legs spread apart.");
  });

  it("falls back to the first dictionary meaning when there is no keyword", () => {
    const rows = [row({ character: "儿", meanings: '["legs"]' })];

    const result = buildComponentContexts(["儿"], rows, []);

    expect(result[0].keyword).toBe("legs");
    expect(result[0].inDictionary).toBe(true);
  });

  it("deduplicates repeated glyphs, keeping the first occurrence", () => {
    const rows = [row({ character: "八", heisigKeyword: "eight" })];

    const result = buildComponentContexts(["八", "亠", "八"], rows, []);

    expect(result.map((c) => c.glyph)).toEqual(["八", "亠"]);
  });

  it("drops empty and whitespace-only glyphs", () => {
    const result = buildComponentContexts(["八", "  ", ""], [], []);

    expect(result.map((c) => c.glyph)).toEqual(["八"]);
  });
});

describe("mergeComponents", () => {
  it("returns components in the authored order", () => {
    const map = new Map([
      ["八", { glyph: "八", keyword: "eight", meanings: [], heisigNumber: 42, inDictionary: true }],
    ]);

    const result = mergeComponents(["亠", "八"], map);

    expect(result.map((c) => c.glyph)).toEqual(["亠", "八"]);
  });

  it("keeps glyphs that were not resolved as unknown components", () => {
    const result = mergeComponents(["儿"], new Map());

    expect(result).toEqual([
      {
        glyph: "儿",
        keyword: null,
        meanings: [],
        heisigNumber: null,
        inDictionary: false,
      },
    ]);
  });
});
