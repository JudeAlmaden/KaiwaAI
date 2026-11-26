import { describe, expect, it } from "vitest";
import { blockerUpdatesForLearningDefaults, learningDefaultsForBlocker } from "./blocker-sync";

describe("blockerUpdatesForLearningDefaults", () => {
  it("mirrors earlyReviewStrategy but NOT the review mix ratio", () => {
    expect(
      blockerUpdatesForLearningDefaults({
        earlyReviewStrategy: "proportional",
      })
    ).toEqual({ earlyReviewStrategy: "proportional" });

    // defaultLearningRatio must NOT flow through to the app blocker:
    // Focus Guard owns its learningRatio via the named session plan picker.
    expect(
      blockerUpdatesForLearningDefaults({ defaultLearningRatio: 0.2 })
    ).toEqual({});
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
  it("keeps the round trip intact for direction, strategy and furigana", () => {
    const blocker = blockerUpdatesForLearningDefaults({
      defaultDirection: "mixed",
      earlyReviewStrategy: "practice",
      defaultFuriganaMode: "learning_only",
    });

    expect(learningDefaultsForBlocker(blocker)).toEqual({
      defaultDirection: "mixed",
      earlyReviewStrategy: "practice",
      defaultFuriganaMode: "learning_only",
    });
  });

  it("does NOT round-trip learningRatio — Focus Guard owns that value", () => {
    // learningRatio on the blocker side should not bleed back into LearningConfig
    const blocker = { learningRatio: 0.7 };
    expect(learningDefaultsForBlocker(blocker)).toEqual({});
  });

  it("ignores changes that have no Learning equivalent", () => {
    expect(
      learningDefaultsForBlocker({ count: 15, studyMode: "due", noDueAction: "autoOpen" })
    ).toEqual({});
  });
});
