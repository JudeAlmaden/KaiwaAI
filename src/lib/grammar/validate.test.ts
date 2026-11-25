import { describe, expect, it } from "vitest";
import { exerciseById } from "./exercises";
import { acceptedAnswers, checkExercise, expectedSentence, normalizeJa } from "./validate";
import type { GrammarExercise } from "./types";

function ex(id: string): GrammarExercise {
  const exercise = exerciseById(id);
  if (!exercise) throw new Error(`missing exercise ${id}`);
  return exercise;
}

describe("sentence assembly", () => {
  it("accepts the canonical order regardless of punctuation", () => {
    const exercise = ex("m1-order-1");
    const result = checkExercise(exercise, ["わたし", "は", "がくせい", "です"]);
    expect(result.correct).toBe(true);
    expect(result.mistake).toBeNull();
    expect(expectedSentence(exercise)).toBe("わたしはがくせいです。");
  });

  it("rejects an extra tile left in the sentence", () => {
    const result = checkExercise(ex("m1-order-1"), [
      "わたし",
      "は",
      "がくせい",
      "です",
      "あなた",
    ]);
    expect(result.correct).toBe(false);
    expect(result.mistake).toMatch(/doesn't belong/);
  });

  it("names a misplaced predicate", () => {
    const result = checkExercise(ex("m2-wo-2"), [
      "たべます",
      "わたし",
      "は",
      "あさごはん",
      "を",
    ]);
    expect(result.correct).toBe(false);
    expect(result.mistake).toMatch(/predicate|end/);
  });

  it("explains that です is not needed after a verb", () => {
    const result = checkExercise(ex("m2-wo-2"), [
      "わたし",
      "は",
      "あさごはん",
      "を",
      "たべます",
      "です",
    ]);
    expect(result.correct).toBe(false);
    expect(result.mistake).toMatch(/です/);
  });

  it("accepts other natural word orders when listed", () => {
    const assembly: GrammarExercise = {
      id: "test-assembly",
      concept: "word-order",
      stage: 1,
      kind: "assemble",
      en: "I drink water.",
      ja: "わたしはみずをのみます。",
      tiles: ["わたし", "は", "みず", "を", "のみます"],
      solution: ["わたし", "は", "みず", "を", "のみます"],
      alternativeOrders: [["みずを", "わたし", "は", "のみます"]],
      rule: "Both orders are natural.",
    };
    expect(
      checkExercise(assembly, ["みずを", "わたし", "は", "のみます"]).correct
    ).toBe(true);
  });

  it("asks for tiles when nothing is placed", () => {
    expect(checkExercise(ex("m1-order-1"), []).mistake).toMatch(/tile/i);
  });
});

describe("particle selection", () => {
  it("accepts only the particle that marks the role", () => {
    const exercise = ex("m2-wo-1");
    expect(checkExercise(exercise, "を").correct).toBe(true);
    expect(checkExercise(exercise, "は").correct).toBe(false);
  });

  it("explains why the chosen particle is wrong", () => {
    const result = checkExercise(ex("m2-nide-1"), "で");
    expect(result.correct).toBe(false);
    expect(result.mistake).toMatch(/destination/);
    expect(result.expected).toBe("わたしはがっこうにいきます。");
  });
});

describe("completion", () => {
  it("accepts kana and kanji spellings", () => {
    const exercise = ex("m1-order-2");
    expect(checkExercise(exercise, "ほん").correct).toBe(true);
    expect(checkExercise(exercise, "本").correct).toBe(true);
  });

  it("rejects an unrelated word", () => {
    const result = checkExercise(ex("m1-order-2"), "ぺん");
    expect(result.correct).toBe(false);
    expect(result.mistake).toBeTruthy();
  });

  it("accepts every listed option form", () => {
    const exercise = ex("m4-vneg-1");
    expect(acceptedAnswers(exercise)).toContain("のみません");
    expect(checkExercise(exercise, "のみません").correct).toBe(true);
    expect(checkExercise(exercise, "のみます").correct).toBe(false);
  });
});

describe("transformation", () => {
  it("accepts the transformed form, not the original", () => {
    const exercise = ex("m4-godan-2");
    expect(checkExercise(exercise, "のみます").correct).toBe(true);
    expect(checkExercise(exercise, "飲みます").correct).toBe(true);
    const unchanged = checkExercise(exercise, "のむ");
    expect(unchanged.correct).toBe(false);
    expect(unchanged.mistake).toMatch(/original/);
  });

  it("accepts legitimate alternative spellings", () => {
    expect(checkExercise(ex("m2-nide-3"), "行きました").correct).toBe(true);
    expect(checkExercise(ex("m2-nide-3"), "いきました").correct).toBe(true);
  });
});

describe("production", () => {
  it("accepts multiple natural sentences", () => {
    const exercise = ex("m2-wo-3");
    expect(checkExercise(exercise, "毎日水を飲みます。").correct).toBe(true);
    expect(checkExercise(exercise, "まいにちみずをのみます").correct).toBe(true);
    expect(checkExercise(exercise, "わたしはまいにちみずをのみます。").correct).toBe(true);
  });

  it("rejects a sentence with the wrong verb", () => {
    expect(checkExercise(ex("m2-wo-3"), "まいにちみずをたべます。").correct).toBe(false);
  });

  it("names a known near miss", () => {
    const result = checkExercise(ex("m4-vneg-3"), "わたしはにくをたべませんでした。");
    expect(result.correct).toBe(false);
    expect(result.mistake).toMatch(/past negative/);
  });

  it("asks for a sentence when the answer is empty", () => {
    expect(checkExercise(ex("m2-wo-3"), "   ").mistake).toMatch(/first/i);
  });
});

describe("normalisation", () => {
  it("ignores spaces, punctuation and katakana width", () => {
    expect(normalizeJa(" コーヒーを のみません。 ")).toBe("こーひーをのみません");
  });
});
