import { describe, expect, it } from "vitest";
import { replySwipeOffset, shouldReplyFromSwipe } from "./swipe-reply";

describe("replySwipeOffset", () => {
  it("recognises the correct horizontal direction for incoming messages", () => {
    expect(replySwipeOffset({ deltaX: 60, deltaY: 4, isOwnMessage: false })).toBe(60);
    expect(replySwipeOffset({ deltaX: -60, deltaY: 4, isOwnMessage: false })).toBe(0);
  });

  it("recognises the opposite horizontal direction for the user's messages", () => {
    expect(replySwipeOffset({ deltaX: -60, deltaY: 4, isOwnMessage: true })).toBe(-60);
    expect(replySwipeOffset({ deltaX: 60, deltaY: 4, isOwnMessage: true })).toBe(0);
  });

  it("does not treat taps or vertical scrolling as reply swipes", () => {
    expect(replySwipeOffset({ deltaX: 8, deltaY: 1, isOwnMessage: false })).toBe(0);
    expect(replySwipeOffset({ deltaX: 25, deltaY: 40, isOwnMessage: false })).toBe(0);
  });

  it("only replies after passing the reply threshold", () => {
    expect(shouldReplyFromSwipe(50)).toBe(false);
    expect(shouldReplyFromSwipe(51)).toBe(true);
  });
});
