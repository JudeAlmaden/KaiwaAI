import { describe, it, expect } from "vitest";
import { validateTokens, segmentJapanese } from "./tokenization";

describe("validateTokens", () => {
  it("aligns Japanese tokens and keeps English from reply", () => {
    const reply = "今日はいい天気！ Nice day!";
    const { tokens, usedFallback } = validateTokens(reply, [
      {
        surface: "今日",
        reading: "きょう",
        romaji: "kyou",
        meaning: "today",
        pos: "noun",
        dictForm: "今日",
      },
      {
        surface: "は",
        reading: "は",
        romaji: "wa",
        meaning: "topic",
        pos: "particle",
        dictForm: "は",
      },
      {
        surface: "いい",
        reading: "いい",
        romaji: "ii",
        meaning: "good",
        pos: "adjective",
        dictForm: "いい",
      },
      {
        surface: "天気",
        reading: "てんき",
        romaji: "tenki",
        meaning: "weather",
        pos: "noun",
        dictForm: "天気",
      },
    ]);
    expect(usedFallback).toBe(false);
    const joined = tokens.map((t) => t.surface).join("");
    expect(joined).toBe(reply);
    expect(tokens.some((t) => t.surface.includes("Nice"))).toBe(true);
  });

  it("falls back when tokens are grossly misaligned", () => {
    const reply = "猫が好きです";
    const { tokens, usedFallback } = validateTokens(reply, [
      {
        surface: "完全に違う",
        reading: "かんぜんにちがう",
        romaji: "x",
        meaning: "x",
        pos: "other",
        dictForm: "x",
      },
    ]);
    expect(usedFallback).toBe(true);
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens.map((t) => t.surface).join("")).toContain("猫");
  });

  it("segments pure Japanese when model returns no tokens", () => {
    const { tokens, usedFallback } = validateTokens("食べたい", []);
    expect(usedFallback).toBe(true);
    expect(tokens.length).toBeGreaterThan(0);
  });
});

describe("segmentJapanese", () => {
  it("returns at least one token", () => {
    expect(segmentJapanese("こんにちは").length).toBeGreaterThan(0);
  });
});
