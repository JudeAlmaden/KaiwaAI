import { describe, expect, it } from "vitest";
import { toHiragana } from "./japanese-input";

describe("toHiragana", () => {
  it("converts basic words", () => {
    expect(toHiragana("neko")).toBe("ねこ");
    expect(toHiragana("nihon", { final: true })).toBe("にほん");
    expect(toHiragana("nihonn")).toBe("にほん");
    expect(toHiragana("sakura")).toBe("さくら");
  });

  it("handles small っ and ん", () => {
    expect(toHiragana("gakkou")).toBe("がっこう");
    expect(toHiragana("kanpai")).toBe("かんぱい");
    expect(toHiragana("kitte")).toBe("きって");
    expect(toHiragana("matcha")).toBe("まっちゃ");
  });

  it("handles digraphs and common spellings", () => {
    expect(toHiragana("sha")).toBe("しゃ");
    expect(toHiragana("tsu")).toBe("つ");
    expect(toHiragana("fu")).toBe("ふ");
    expect(toHiragana("ji")).toBe("じ");
    expect(toHiragana("konnichiwa")).toBe("こんにちわ");
  });

  it("converts particles", () => {
    expect(toHiragana("wo")).toBe("を");
    expect(toHiragana("ha")).toBe("は");
  });

  it("leaves kana, kanji, punctuation and spaces untouched", () => {
    expect(toHiragana("五 は ＿＿ です")).toBe("五 は ＿＿ です");
    expect(toHiragana("neko wa mizu wo nomu.")).toBe("ねこ わ みず を のむ.");
  });

  it("leaves incomplete romaji for the next keystroke", () => {
    expect(toHiragana("k")).toBe("k");
    expect(toHiragana("ky")).toBe("ky");
    expect(toHiragana("n")).toBe("n");
    expect(toHiragana("s")).toBe("s");
    expect(toHiragana("sh")).toBe("sh");
    expect(toHiragana("t")).toBe("t");
  });

  it("converts n correctly on live keystroke sequences without premature ん", () => {
    // "ni" keystroke sequence: "n" then "i" must become "に", not "んい"
    const step1 = toHiragana("n");
    expect(step1).toBe("n");
    const step2 = toHiragana(step1 + "i");
    expect(step2).toBe("に");

    // All n-vowels
    expect(toHiragana("na")).toBe("な");
    expect(toHiragana("ni")).toBe("に");
    expect(toHiragana("nu")).toBe("ぬ");
    expect(toHiragana("ne")).toBe("ね");
    expect(toHiragana("no")).toBe("の");
    expect(toHiragana("nya")).toBe("にゃ");

    // "inu" keystroke sequence: "i" -> "in" -> "inu" must become "いぬ", not "いんう"
    let inuText = "";
    inuText = toHiragana(inuText + "i");
    expect(inuText).toBe("い");
    inuText = toHiragana(inuText + "n");
    expect(inuText).toBe("いn");
    inuText = toHiragana(inuText + "u");
    expect(inuText).toBe("いぬ");

    // "kani" keystroke sequence:
    let kaniText = "";
    kaniText = toHiragana(kaniText + "k");
    expect(kaniText).toBe("k");
    kaniText = toHiragana(kaniText + "a");
    expect(kaniText).toBe("か");
    kaniText = toHiragana(kaniText + "n");
    expect(kaniText).toBe("かn");
    kaniText = toHiragana(kaniText + "i");
    expect(kaniText).toBe("かに");

    // "nn" at end becomes "ん"
    expect(toHiragana("nn")).toBe("ん");
    expect(toHiragana("gohann")).toBe("ごはん");

    // "n " with space becomes "ん "
    expect(toHiragana("nihon ")).toBe("にほん ");

    // final: true converts trailing n
    expect(toHiragana("tsukaren", { final: true })).toBe("つかれん");
  });
});
