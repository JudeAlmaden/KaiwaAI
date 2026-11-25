import { describe, expect, it } from "vitest";
import {
  distractorTypes,
  explainConjugation,
  patternAttrs,
  patternLabel,
  whyWrong,
} from "./conjugation-patterns";
import { isConjugationCorrect, buildConjugationRound } from "./sentence-task";

const godan = { id: "k", word: "書く", reading: "かく", meaning: "to write", partOfSpeech: "verb", verbType: "godan" };
const ichidan = { id: "t", word: "食べる", reading: "たべる", meaning: "to eat", partOfSpeech: "verb", verbType: "ichidan" };
const iAdj = { id: "a", word: "高い", reading: "たかい", meaning: "expensive", partOfSpeech: "adjective", adjectiveType: "i_adjective" };
const hanasu = { id: "h", word: "話す", reading: "はなす", meaning: "to speak", partOfSpeech: "verb", verbType: "godan" };
const suru = { id: "s", word: "する", reading: "する", meaning: "to do", partOfSpeech: "verb", verbType: "suru" };

describe("terminology", () => {
  it("calls the polite form non-past, not present", () => {
    expect(patternLabel("masu")).toBe("Polite non-past");
    expect(patternLabel("masu_negative")).toBe("Polite negative non-past");
    expect(patternLabel("masu_past")).toBe("Polite past");
    expect(patternLabel("unknown_form")).toBe("unknown form");
  });
});

describe("explainConjugation", () => {
  it("explains a Godan verb step by step", () => {
    const explanation = explainConjugation({
      target: godan,
      formType: "masu",
      form: "書きます",
      choices: [
        { text: "書きます", formType: "masu" },
        { text: "書きました", formType: "masu_past" },
      ],
    });
    expect(explanation.headline).toBe("書く → 書きます");
    expect(explanation.steps.join(" ")).toContain("Godan (う-verb)");
    expect(explanation.steps).toContain("Change the final く to き.");
    expect(explanation.steps).toContain("Add ます.");
    expect(explanation.steps.at(-1)).toBe("Result: 書きます (polite non-past).");
    expect(explanation.others).toHaveLength(1);
    expect(explanation.others[0].why).toContain("past");
  });

  it("explains an Ichidan verb by dropping る", () => {
    const explanation = explainConjugation({ target: ichidan, formType: "te", form: "食べて" });
    expect(explanation.steps).toContain("Drop the final る.");
    expect(explanation.steps).toContain("Add て.");
  });

  it("explains an い-adjective negative", () => {
    const explanation = explainConjugation({
      target: iAdj,
      formType: "negative",
      form: "高くない",
    });
    expect(explanation.steps).toContain("Drop the final い.");
    expect(explanation.steps).toContain("Add くない.");
    expect(explanation.steps.join(" ")).toContain("です");
  });

  it("adds a compact transform, other examples and progressive hints", () => {
    const explanation = explainConjugation({ target: godan, formType: "masu", form: "書きます" });
    expect(explanation.transform).toBe("く → き + ます");
    expect(explanation.examples.length).toBeGreaterThan(0);
    expect(explanation.examples.every((item) => item.from !== "書く")).toBe(true);
    expect(explanation.hints).toHaveLength(3);
    expect(explanation.hints[2]).toContain("Change the final く to き");
    expect(explanation.hints.join(" ")).not.toContain("書きます");
  });

  it("frames the negative context and transformation without giving the answer", () => {
    const explanation = explainConjugation({
      target: hanasu,
      formType: "plain_negative",
      form: "話さない",
    });
    expect(explanation.transform).toBe("す → さ + ない");
    expect(explanation.hints[0]).toContain("negative");
    expect(explanation.hints[1]).toContain("Group 1");
    expect(explanation.hints[2]).toContain("Change the final す to さ");
    expect(explanation.hints.join(" ")).not.toContain("話さない");
  });

  it("describes adjective transforms and keeps irregular hints safe", () => {
    const adjective = explainConjugation({ target: iAdj, formType: "negative", form: "高くない" });
    expect(adjective.transform).toBe("い → くない");
    expect(adjective.examples.length).toBeGreaterThan(0);

    const irregular = explainConjugation({ target: suru, formType: "masu", form: "します" });
    expect(irregular.hints.join(" ")).not.toContain("します");
  });
});

describe("distractors", () => {
  it("uses near misses from the same register", () => {
    const types = distractorTypes("masu", ["masu", "masu_past", "masu_negative", "masu_past_negative", "te"]);
    expect(types).toEqual(["masu_past", "masu_negative", "masu_past_negative"]);
    expect(types).not.toContain("te");
  });

  it("explains a wrong politeness or tense", () => {
    expect(whyWrong("masu", "masu_past")).toContain("past");
    expect(whyWrong("masu", "masu_negative")).toContain("negative");
    expect(patternAttrs("masu").polite).toBe(true);
  });
});

describe("typed answers and stages", () => {
  it("accepts either kanji or kana for a typed form", () => {
    const round = buildConjugationRound(godan, 0)!;
    expect(isConjugationCorrect("書きます", round)).toBe(true);
    expect(isConjugationCorrect("かきます", round)).toBe(true);
    expect(isConjugationCorrect("書きました", round)).toBe(false);
    expect(isConjugationCorrect("  ", round)).toBe(false);
  });

  it("drops choices once a pattern reaches application", () => {
    const practiced = buildConjugationRound(godan, 0, {
      pattern: "masu",
      attempts: 8,
      correct: 8,
      streak: 4,
    })!;
    expect(practiced.stage).toBe(4);
    expect(practiced.mode).toBe("typed");

    const fresh = buildConjugationRound(godan, 0)!;
    expect(fresh.stage).toBe(1);
    expect(fresh.mode).toBe("choice");
  });
});
