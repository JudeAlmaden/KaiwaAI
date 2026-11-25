import { describe, expect, it } from "vitest";
import { CONCEPT_BY_ID } from "./curriculum";
import { cleanGloss, deckWordsFrom } from "./deck";
import { generateExercises } from "./generate";
import { normalizeJa } from "./validate";

const cards = [
  { word: "猫", reading: "ねこ", meaning: "cat", partOfSpeech: "noun" },
  { word: "本", reading: "ほん", meaning: "book; origin", partOfSpeech: "noun" },
  {
    word: "書く",
    reading: "かく",
    meaning: "to write",
    partOfSpeech: "verb",
    verbType: "godan",
  },
  {
    word: "食べる",
    reading: "たべる",
    meaning: "to eat",
    partOfSpeech: "verb",
    verbType: "ichidan",
  },
  {
    word: "高い",
    reading: "たかい",
    meaning: "expensive",
    partOfSpeech: "adjective",
    adjectiveType: "i_adjective",
  },
  {
    word: "静か",
    reading: "しずか",
    meaning: "quiet",
    partOfSpeech: "adjective",
    adjectiveType: "na_adjective",
  },
  { word: "とても", reading: "とても", meaning: "very", partOfSpeech: "adverb" },
  { word: "おはよう", reading: "おはよう", meaning: "good morning", partOfSpeech: "expression" },
];

const words = deckWordsFrom(cards);
const generated = generateExercises(words);

function find(concept: string, kind?: string) {
  return generated.find(
    (exercise) =>
      exercise.concept === concept && (!kind || exercise.kind === kind)
  );
}

describe("deck words", () => {
  it("cleans glosses for sentence use", () => {
    expect(cleanGloss("to write; writing")).toBe("write");
    expect(cleanGloss("a cat")).toBe("cat");
    expect(cleanGloss("expensive (for money)")).toBe("expensive");
  });

  it("keeps only words the templates can place", () => {
    expect(words.map((word) => word.word).sort()).toEqual(
      ["本", "書く", "食べる", "猫", "静か", "高い"].sort()
    );
    expect(words.find((word) => word.word === "本")?.gloss).toBe("book");
  });
});

describe("generated exercises", () => {
  it("builds a noun sentence from a saved noun", () => {
    const exercise = find("noun-sentence", "assemble");
    expect(exercise?.ja).toBe("これは猫です。");
    expect(exercise?.generated).toBe(true);
  });

  it("turns a saved noun into a particle drill", () => {
    const exercise = find("particle-wa");
    expect(exercise?.kind).toBe("particle");
    if (exercise?.kind !== "particle") return;
    expect(exercise.answer).toBe("は");
    expect(exercise.options).toContain("は");
  });

  it("conjugates a saved verb into the polite forms", () => {
    const masu = find("verb-godan");
    expect(masu?.kind).toBe("transform");
    if (masu?.kind !== "transform") return;
    expect(masu.from).toBe("書く");
    expect(masu.answer).toBe("書きます");
    expect(masu.accepted).toContain("かきます");

    const negative = generated.find(
      (exercise) =>
        exercise.concept === "verb-negative" &&
        exercise.kind === "transform" &&
        exercise.from === "書く"
    );
    expect(negative?.kind === "transform" ? negative.answer : null).toBe("書きます".replace("ます", "ません"));
  });

  it("uses a curated scene to build a full verb sentence", () => {
    const sentence = generated.find(
      (exercise) =>
        exercise.kind === "assemble" && exercise.ja.includes("食べます")
    );
    expect(sentence?.ja).toBe("わたしはごはんを食べます。");
    expect(sentence?.en).toBe("I eat a meal.");
  });

  it("keeps every assembly solution consistent with its sentence", () => {
    for (const exercise of generated) {
      if (exercise.kind !== "assemble") continue;
      expect(normalizeJa(exercise.solution.join("")), exercise.id).toBe(
        normalizeJa(exercise.ja)
      );
      for (const tile of exercise.solution) {
        expect(exercise.tiles, exercise.id).toContain(tile);
      }
    }
  });

  it("only targets real concepts and keeps ids unique", () => {
    const ids = generated.map((exercise) => exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const exercise of generated) {
      expect(CONCEPT_BY_ID.has(exercise.concept), exercise.id).toBe(true);
      expect(exercise.stage).toBeGreaterThanOrEqual(1);
      expect(exercise.stage).toBeLessThanOrEqual(5);
      expect(exercise.rule.trim().length, exercise.id).toBeGreaterThan(8);
    }
  });

  it("respects the limit and the per-word cap", () => {
    expect(generateExercises(words, 3)).toHaveLength(3);
    const byWord = new Map<string, number>();
    for (const exercise of generated) {
      const word = exercise.id.split(":")[1]!;
      byWord.set(word, (byWord.get(word) ?? 0) + 1);
    }
    for (const [word, count] of byWord) {
      expect(count, word).toBeLessThanOrEqual(4);
    }
  });

  it("generates nothing without deck words", () => {
    expect(generateExercises([])).toEqual([]);
  });
});
