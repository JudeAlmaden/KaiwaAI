import { describe, expect, it } from "vitest";
import { blockerUpdatesForLearningDefaults, learningDefaultsForBlocker } from "./blocker-sync";

describe("blockerUpdatesForLearningDefaults", () => {
  it("mirrors the review mix and early-review strategy", () => {
    expect(
      blockerUpdatesForLearningDefaults({
        defaultLearningRatio: 0.2,
        earlyReviewStrategy: "proportional",
      })
    ).toEqual({ learningRatio: 0.2, earlyReviewStrategy: "proportional" });
  });

  it("mirrors furigana as both the modern mode and the legacy boolean", () => {
    expect(blockerUpdatesForLearningDefaults({ defaultFuriganaMode: "never" })).toEqual({
      furiganaMode: "never",
      showFurigana: false,
    });
    expect(blockerUpdatesForLearningDefaults({ defaultFuriganaMode: "always" })).toEqual({
      furiganaMode: "always",
      showFurigana: true,
    });
  });

  it("mirrors direction", () => {
    expect(blockerUpdatesForLearningDefaults({ defaultDirection: "en-to-jp" })).toEqual({
      direction: "en-to-jp",
    });
  });

  it("writes nothing for unrelated settings", () => {
    expect(blockerUpdatesForLearningDefaults({ maxNewCards: 10 })).toEqual({});
    expect(blockerUpdatesForLearningDefaults({ newPerSession: 3 })).toEqual({});
  });
});

describe("learningDefaultsForBlocker", () => {
  it("keeps the round trip intact", () => {
    const blocker = blockerUpdatesForLearningDefaults({
      defaultLearningRatio: 0.7,
      defaultDirection: "mixed",
      earlyReviewStrategy: "practice",
      defaultFuriganaMode: "learning_only",
    });

    expect(learningDefaultsForBlocker(blocker)).toEqual({
      defaultLearningRatio: 0.7,
      defaultDirection: "mixed",
      earlyReviewStrategy: "practice",
      defaultFuriganaMode: "learning_only",
    });
  });

  it("ignores changes that have no Learning equivalent", () => {
    expect(
      learningDefaultsForBlocker({ count: 15, studyMode: "due", noDueAction: "autoOpen" })
    ).toEqual({});
  });
});
