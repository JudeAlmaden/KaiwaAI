import { describe, it, expect } from "vitest";
import {
  moodFor,
  moodFromScore,
  nextChatMood,
  canBeProactiveForMood,
  blendMood,
  isMood,
  moodToneLine,
  DORMANT_AFTER,
} from "./mood";

describe("outreach mood ladder", () => {
  it("climbs from cheerful to dormant as ignores accumulate", () => {
    expect(moodFor(0)).toBe("cheerful");
    expect(moodFor(1)).toBe("hopeful");
    expect(moodFor(2)).toBe("wistful");
    expect(moodFor(4)).toBe("sad");
    expect(moodFor(6)).toBe("givingUp");
    expect(moodFor(DORMANT_AFTER)).toBe("dormant");
  });
});

describe("isMood", () => {
  it("accepts known moods only", () => {
    expect(isMood("cheerful")).toBe(true);
    expect(isMood("neutral")).toBe(true);
    expect(isMood("angry")).toBe(false);
    expect(isMood(null)).toBe(false);
  });
});

describe("moodToneLine", () => {
  it("embeds gap when hours >= 24", () => {
    const line = moodToneLine("wistful", 48);
    expect(line).toContain("YOUR MOOD");
    expect(line).toContain("2 day");
    expect(line).toContain("Never guilt-trip");
  });

  it("returns empty for dormant (no prompt)", () => {
    expect(moodToneLine("dormant")).toBe("");
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

  it("clamps score to ±10", () => {
    const up = nextChatMood({
      hoursSinceUserReply: 0,
      consecutiveIgnored: 0,
      userJustReplied: true,
      moodScore: 9,
    });
    expect(up.moodScore).toBeLessThanOrEqual(10);

    const down = nextChatMood({
      hoursSinceUserReply: 200,
      consecutiveIgnored: 10,
      userJustReplied: false,
      moodScore: -9,
    });
    expect(down.moodScore).toBeGreaterThanOrEqual(-10);
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

  it("ignores invalid or neutral model mood", () => {
    expect(blendMood("hopeful", "nope", 3)).toEqual({
      mood: "hopeful",
      moodScore: 3,
    });
    expect(blendMood("hopeful", "neutral", 3)).toEqual({
      mood: "hopeful",
      moodScore: 3,
    });
  });
});
