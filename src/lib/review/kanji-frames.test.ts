import { describe, expect, it } from "vitest";
import { readingsFrom, toKanji, toKanjiParts } from "./kanji-frames";

describe("frame kanji", () => {
  it("upgrades whole chunks and keeps their particles", () => {
    expect(toKanji("わたしは きのう みずを")).toBe("私は 昨日 水を");
    expect(toKanji("ここに なまえを")).toBe("ここに 名前を");
    expect(toKanji("とうきょうに")).toBe("東京に");
    expect(toKanji("えきで")).toBe("駅で");
  });

  it("leaves unknown words and punctuation alone", () => {
    expect(toKanji("この かばんは")).toBe("この かばんは");
    expect(toKanji("です。")).toBe("です。");
    expect(toKanji("")).toBe("");
  });

  it("never turns a particle into kanji", () => {
    expect(toKanji("わたしは")).toBe("私は");
    expect(toKanji("ほんを")).toBe("本を");
    expect(toKanji("は")).toBe("は");
  });

  it("keeps the ruby over the kanji and the particle outside it", () => {
    expect(toKanjiParts("ほんを")).toEqual([{ text: "本", ruby: "ほん" }, { text: "を" }]);
    expect(toKanjiParts("わたしは きのう")).toEqual([
      { text: "私", ruby: "わたし" },
      { text: "は" },
      { text: " " },
      { text: "昨日", ruby: "きのう" },
    ]);
  });

  it("maps readings for the words it converted", () => {
    const readings = readingsFrom(toKanjiParts("わたしは きのう みずを"));
    expect(readings).toEqual({ 私: "わたし", 昨日: "きのう", 水: "みず" });
  });
});
