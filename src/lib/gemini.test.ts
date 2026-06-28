import { describe, it, expect } from "vitest";
import { extractJsonString, salvageKaiResponse, stripRomajiShadows } from "./gemini";
import type { KaiResponse } from "./types";

function resp(reply: string, tokens: KaiResponse["tokens"] = []): KaiResponse {
  return {
    reply,
    english: "",
    correction: null,
    tokens,
    newWords: [],
    memorySuggestions: [],
  };
}

describe("extractJsonString", () => {
  it("reads a complete top-level string field", () => {
    const t = '{"reply":"hello","english":"hi"}';
    expect(extractJsonString(t, "reply")).toBe("hello");
    expect(extractJsonString(t, "english")).toBe("hi");
  });

  it("resolves escape sequences", () => {
    const t = '{"reply":"line\\nbreak and \\"quote\\""}';
    expect(extractJsonString(t, "reply")).toBe('line\nbreak and "quote"');
  });

  it("returns null when the value is truncated (no closing quote)", () => {
    const t = '{"reply":"this got cut off mid sen';
    expect(extractJsonString(t, "reply")).toBeNull();
  });

  it("returns null for a missing key", () => {
    expect(extractJsonString('{"reply":"x"}', "english")).toBeNull();
  });

  it("tolerates whitespace between colon and value", () => {
    expect(extractJsonString('{"reply"  :  "spaced"}', "reply")).toBe("spaced");
  });
});

describe("salvageKaiResponse", () => {
  it("recovers reply + english when tokens[] is truncated", () => {
    // Realistic shape: full reply/english, then the big tokens array cut off.
    const truncated =
      '{"reply":"ジャガイモが好きです","english":"I like potatoes","tokens":[{"surface":"ジャガイモ","reading":"じゃが';
    const r = salvageKaiResponse(truncated);
    expect(r).not.toBeNull();
    expect(r!.reply).toBe("ジャガイモが好きです");
    expect(r!.english).toBe("I like potatoes");
    expect(r!.correction).toBeNull();
    expect(r!.tokens).toEqual([]);
    expect(r!.newWords).toEqual([]);
  });

  it("defaults english to empty string when only reply survives", () => {
    const r = salvageKaiResponse('{"reply":"hi there","tok');
    expect(r).not.toBeNull();
    expect(r!.reply).toBe("hi there");
    expect(r!.english).toBe("");
  });

  it("returns null when even the reply is unrecoverable", () => {
    expect(salvageKaiResponse('{"repl')).toBeNull();
    expect(salvageKaiResponse('{"reply":"unterminated')).toBeNull();
  });
});

describe("stripRomajiShadows", () => {
  it("strips a romaji shadow right after a kanji/kana word", () => {
    const r = resp("ありがとう (arigatou) for that!");
    stripRomajiShadows(r);
    expect(r.reply).toBe("ありがとう for that!");
  });

  it("strips a shadow that sits after a closing bracket 」", () => {
    const r = resp("She said 「言います」(iimasu) softly.");
    stripRomajiShadows(r);
    expect(r.reply).toBe("She said 「言います」 softly.");
  });

  it("strips full-width parens too", () => {
    const r = resp("素敵（suteki）ですね");
    stripRomajiShadows(r);
    expect(r.reply).toBe("素敵ですね");
  });

  it("keeps a genuine English aside after Japanese", () => {
    const r = resp("私 (this is fine) likes it");
    stripRomajiShadows(r);
    expect(r.reply).toBe("私 (this is fine) likes it");
  });

  it("removes shadow tokens from the tokens array", () => {
    const r = resp("ありがとう (arigatou)!", [
      { surface: "ありがとう", reading: "ありがとう", romaji: "arigatou", meaning: "thanks", pos: "expression", dictForm: "ありがとう" },
      { surface: " ", reading: " ", romaji: " ", meaning: " ", pos: "other", dictForm: " " },
      { surface: "(", reading: "(", romaji: "(", meaning: "(", pos: "other", dictForm: "(" },
      { surface: "arigatou", reading: "arigatou", romaji: "arigatou", meaning: "thanks", pos: "other", dictForm: "arigatou" },
      { surface: ")", reading: ")", romaji: ")", meaning: ")", pos: "other", dictForm: ")" },
      { surface: "!", reading: "!", romaji: "!", meaning: "!", pos: "other", dictForm: "!" },
    ]);
    stripRomajiShadows(r);
    expect(r.tokens.map((t) => t.surface)).toEqual(["ありがとう", " ", "!"]);
  });
});
