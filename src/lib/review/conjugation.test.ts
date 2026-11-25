import { describe, expect, it } from "vitest";
import { buildGodan, buildIchidan, buildIAdj, buildNaAdj, formsForTarget } from "./conjugation";

function forms(rows: ReturnType<typeof buildGodan>) {
  if ("error" in rows) throw new Error(rows.error);
  return Object.fromEntries(rows.map((row) => [row.formType, row.result]));
}

describe("shared SRS conjugation builders", () => {
  it("builds godan forms", () => {
    expect(forms(buildGodan("飲む"))).toMatchObject({
      dictionary: "飲む",
      masu: "飲みます",
      masu_past: "飲みました",
      masu_negative: "飲みません",
      te: "飲んで",
      plain_past: "飲んだ",
      plain_negative: "飲まない",
      plain_past_negative: "飲まなかった",
    });
  });

  it("builds ichidan forms", () => {
    expect(forms(buildIchidan("食べる"))).toMatchObject({
      masu: "食べます",
      masu_past: "食べました",
      te: "食べて",
      plain_past: "食べた",
      plain_negative: "食べない",
    });
  });

  it("builds i-adjective forms", () => {
    expect(forms(buildIAdj("忙しい"))).toMatchObject({
      masu: "忙しいです",
      negative: "忙しくない",
      past: "忙しかった",
      past_negative: "忙しくなかった",
    });
  });

  it("builds na-adjective forms", () => {
    expect(forms(buildNaAdj("静か"))).toMatchObject({
      attributive: "静かな",
      masu: "静かです",
      negative: "静かじゃない",
      past: "静かだった",
      past_negative: "静かじゃなかった",
    });
  });
});

describe("formsForTarget", () => {
  it("generates a verb's forms with both surface and reading", () => {
    const all = formsForTarget({
      word: "疲れる",
      reading: "つかれる",
      partOfSpeech: "verb",
      verbType: "ichidan",
    });
    const byType = Object.fromEntries(all.map((form) => [form.formType, form]));

    expect(byType.plain_past).toMatchObject({ form: "疲れた", reading: "つかれた" });
    expect(byType.masu_past).toMatchObject({ form: "疲れました", reading: "つかれました" });
    expect(byType.plain_negative).toMatchObject({ form: "疲れない", reading: "つかれない" });
  });

  it("keeps stored WordForms and fills the rest", () => {
    const all = formsForTarget({
      word: "来る",
      reading: "くる",
      partOfSpeech: "verb",
      verbType: "kuru",
      forms: [{ form: "来た", reading: "きた", formType: "plain_past" }],
    });

    expect(all.find((form) => form.formType === "plain_past")).toMatchObject({
      form: "来た",
      reading: "きた",
    });
    expect(all.some((form) => form.formType === "dictionary")).toBe(true);
  });

  it("returns the dictionary form when no rules apply", () => {
    expect(
      formsForTarget({ word: "今週", reading: "こんしゅう", partOfSpeech: "noun" })
    ).toEqual([
      expect.objectContaining({ formType: "dictionary", form: "今週", reading: "こんしゅう" }),
    ]);
  });
});
