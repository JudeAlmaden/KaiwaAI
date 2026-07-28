import { describe, expect, it } from "vitest";
import { buildCustomSessionStartParams } from "./customSession";

describe("buildCustomSessionStartParams", () => {
  it("maps user selections into review start params", () => {
    const params = buildCustomSessionStartParams({
      reviewType: "vocabulary",
      studyMode: "new",
      direction: "en-to-jp",
      limit: 15,
      isContinuous: true,
      activeLimit: 3,
    });

    expect(params).toEqual({
      studyMode: "new",
      limit: 15,
      isContinuous: true,
      reviewType: "vocabulary",
      direction: "en-to-jp",
      activeLimit: 3,
    });
  });

  it("clamps values to sensible bounds", () => {
    const params = buildCustomSessionStartParams({
      reviewType: "kanji",
      studyMode: "all",
      direction: "mixed",
      limit: 0,
      isContinuous: false,
      activeLimit: 99,
    });

    expect(params.limit).toBe(1);
    expect(params.activeLimit).toBe(20);
  });
});
