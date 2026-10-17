import { describe, expect, it } from "vitest";
import { repairSplitTokenSurfaces } from "./token-repair";
import type { CachedToken } from "./types";

const token = (surface: string, dictForm = surface): CachedToken => ({
  surface,
  reading: surface,
  romaji: surface,
  meaning: surface,
  pos: "adjective",
  dictForm,
});

describe("repairSplitTokenSurfaces", () => {
  it("repairs 小 + さい when the kanji fragment owns the word metadata", () => {
    const result = repairSplitTokenSurfaces([token("小", "小さい"), token("さい")]);

    expect(result).toHaveLength(1);
    expect(result[0].surface).toBe("小さい");
    expect(result[0].dictForm).toBe("小さい");
  });

  it("keeps a kanji and following particle separate", () => {
    const result = repairSplitTokenSurfaces([token("猫", "猫"), { ...token("は"), pos: "particle" }]);

    expect(result.map((item) => item.surface)).toEqual(["猫", "は"]);
  });

  it("clears corrupted bracket meanings from historical token payloads", () => {
    const result = repairSplitTokenSurfaces([
      { ...token("値段"), meaning: "[" },
      { ...token("本"), meaning: "]" },
      { ...token("猫"), meaning: "cat" },
    ]);

    expect(result[0]?.meaning).toBe("");
    expect(result[1]?.meaning).toBe("");
    expect(result[2]?.meaning).toBe("cat");
  });
});
