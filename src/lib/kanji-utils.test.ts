import { describe, it, expect } from "vitest";
import { extractKanji, hasKanji } from "./kanji-utils";

describe("kanji-utils", () => {
  describe("extractKanji", () => {
    it("extracts kanji from mixed Japanese text", () => {
      const result = extractKanji("食べたい");
      expect(result).toEqual(["食"]);
    });

    it("extracts multiple unique kanji", () => {
      const result = extractKanji("日本語を勉強します");
      expect(result).toEqual(["日", "本", "語", "勉", "強"]);
    });

    it("removes duplicate kanji", () => {
      const result = extractKanji("日本の日");
      expect(result).toEqual(["日", "本"]);
    });

    it("returns empty array for hiragana-only text", () => {
      const result = extractKanji("たべたい");
      expect(result).toEqual([]);
    });

    it("returns empty array for katakana-only text", () => {
      const result = extractKanji("コーヒー");
      expect(result).toEqual([]);
    });

    it("returns empty array for romaji", () => {
      const result = extractKanji("tabetai");
      expect(result).toEqual([]);
    });

    it("handles mixed content with English", () => {
      const result = extractKanji("I love 日本!");
      expect(result).toEqual(["日", "本"]);
    });

    it("handles empty string", () => {
      const result = extractKanji("");
      expect(result).toEqual([]);
    });

    it("extracts all kanji from complex sentence", () => {
      const result = extractKanji("昨日、図書館で本を読みました。");
      expect(result).toEqual(["昨", "日", "図", "書", "館", "本", "読"]);
    });
  });

  describe("hasKanji", () => {
    it("returns true for text with kanji", () => {
      expect(hasKanji("食べる")).toBe(true);
    });

    it("returns true for text with single kanji", () => {
      expect(hasKanji("犬")).toBe(true);
    });

    it("returns false for hiragana-only", () => {
      expect(hasKanji("たべる")).toBe(false);
    });

    it("returns false for katakana-only", () => {
      expect(hasKanji("コーヒー")).toBe(false);
    });

    it("returns false for romaji", () => {
      expect(hasKanji("taberu")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(hasKanji("")).toBe(false);
    });

    it("returns true for mixed text with English", () => {
      expect(hasKanji("Hello 世界")).toBe(true);
    });

    it("handles numbers and symbols", () => {
      expect(hasKanji("123!@# あいう")).toBe(false);
      expect(hasKanji("123!@# 漢字")).toBe(true);
    });
  });
});
