import { describe, it, expect } from "vitest";
import { applyEnrichments, enrichmentKey } from "./dictionary-enrich";

describe("enrichmentKey", () => {
  it("prefers dictForm over surface for conjugated verbs", () => {
    expect(enrichmentKey({ surface: "食べた", dictForm: "食べる" })).toBe("食べる");
  });

  it("falls back to surface", () => {
    expect(enrichmentKey({ surface: "猫" })).toBe("猫");
  });
});

describe("applyEnrichments", () => {
  it("fills meaning/reading from local hits without changing surface", () => {
    const tokens = [
      {
        surface: "食べた",
        dictForm: "食べる",
        reading: "たべた",
        meaning: "ate",
        pos: "verb",
      },
    ];
    const out = applyEnrichments(tokens, [
      {
        found: true,
        surface: "食べた",
        dictForm: "食べる",
        reading: "たべる",
        meaning: "to eat",
        pos: "verb",
      },
    ]);
    expect(out[0].surface).toBe("食べた");
    expect(out[0].dictForm).toBe("食べる");
    expect(out[0].meaning).toBe("to eat");
    expect(out[0].reading).toBe("たべる");
  });

  it("leaves tokens alone when not found", () => {
    const tokens = [
      {
        surface: "猫",
        dictForm: "猫",
        reading: "ねこ",
        meaning: "cat",
        pos: "noun",
      },
    ];
    expect(
      applyEnrichments(tokens, [
        {
          found: false,
          surface: "猫",
          dictForm: "猫",
          reading: "ねこ",
          meaning: "cat",
          pos: "noun",
        },
      ])
    ).toEqual(tokens);
  });

  it("tolerates missing enrichment slots", () => {
    const tokens = [
      {
        surface: "犬",
        dictForm: "犬",
        reading: "いぬ",
        meaning: "dog",
        pos: "noun",
      },
    ];
    expect(applyEnrichments(tokens, [])).toEqual(tokens);
  });
});
