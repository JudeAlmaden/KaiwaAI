import { describe, expect, it } from "vitest";
import { GRAMMAR_EXERCISES } from "./exercises";
import { assembleTiles, decoyCount, extraDecoys } from "./noise";
import { normalizeJa } from "./validate";

const assemblies = GRAMMAR_EXERCISES.filter(
  (exercise) => exercise.kind === "assemble"
);

describe("assembly noise", () => {
  it("keeps every solution tile and the authored decoys", () => {
    for (const exercise of assemblies) {
      const tiles = assembleTiles(exercise);
      for (const tile of exercise.solution) {
        expect(tiles, exercise.id).toContain(tile);
      }
      expect(tiles.length, exercise.id).toBeGreaterThanOrEqual(exercise.tiles.length);
    }
  });

  it("adds no duplicate tiles", () => {
    for (const exercise of assemblies) {
      const tiles = assembleTiles(exercise);
      expect(new Set(tiles).size, exercise.id).toBe(tiles.length);
    }
  });

  it("aims for at least three decoys", () => {
    for (const exercise of assemblies) {
      expect(decoyCount(exercise), exercise.id).toBeGreaterThanOrEqual(3);
      expect(decoyCount(exercise), exercise.id).toBeLessThanOrEqual(4);
    }
  });

  it("offers wrong tenses for verb endings", () => {
    const sentence = assemblies.find((exercise) => exercise.id === "m2-ga-3");
    expect(sentence).toBeDefined();
    if (!sentence) return;
    expect(extraDecoys(sentence)).toContain("わかりました");
    expect(extraDecoys(sentence)).not.toContain("わかります");
  });

  it("is stable per exercise and mixes the order", () => {
    const sentence = assemblies.find((exercise) => exercise.id === "m2-ga-3");
    expect(sentence).toBeDefined();
    if (!sentence) return;
    expect(assembleTiles(sentence)).toEqual(assembleTiles(sentence));
    expect(assembleTiles(sentence).join("")).not.toBe(
      normalizeJa(sentence.solution.join("")).replace(/。$/, "")
    );
  });
});
