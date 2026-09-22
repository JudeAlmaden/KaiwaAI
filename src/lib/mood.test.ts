import { describe, it, expect } from "vitest";
import {
  moodFor,
  moodFromScore,
  nextChatMood,
  canBeProactiveForMood,
  blendMood,
  DORMANT_AFTER,
} from "./mood";

describe("outreach mood ladder", () => {
  it("climbs from cheerful to dormant as ignores accumulate", () => {
    expect(moodFor(0)).toBe("cheerful");
    expect(moodFor(1)).toBe("hopeful");
    expect(moodFor(2)).toBe("wistful");
    expect(moodFor(DORMANT_AFTER)).toBe("dormant");
  });
});

describe("chat mood score", () => {
  it("maps scores to moods", () => {
    expect(moodFromScore(8)).toBe("cheerful");
    expect(moodFromScore(0)).toBe("neutral");
    expect(moodFromScore(-4)).toBe("sad");
    expect(moodFromScore(-10)).toBe("dormant");
  });

  it("resets upward when the user replies", () => {
    const next = nextChatMood({
      hoursSinceUserReply: 48,
      consecutiveIgnored: 4,
      userJustReplied: true,
      moodScore: -5,
    });
    expect(next.moodScore).toBeGreaterThanOrEqual(0);
    expect(["cheerful", "hopeful", "neutral"]).toContain(next.mood);
  });

  it("decays when outreach is ignored", () => {
    const next = nextChatMood({
      hoursSinceUserReply: 100,
      consecutiveIgnored: 5,
      userJustReplied: false,
      moodScore: 2,
    });
    expect(next.moodScore).toBeLessThan(2);
  });

  it("gates proactive on dormant/givingUp", () => {
    expect(canBeProactiveForMood("cheerful")).toBe(true);
    expect(canBeProactiveForMood("dormant")).toBe(false);
    expect(canBeProactiveForMood("givingUp")).toBe(false);
  });

  it("blends model mood with deterministic score", () => {
    const blended = blendMood("neutral", "wistful", 0);
    expect(blended.moodScore).toBeLessThanOrEqual(0);
  });
});
