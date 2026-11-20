import { describe, it, expect } from "vitest";
import {
  nextQueueModalState,
  type QueueModalState,
  type QueueResponse,
} from "./queue-state";

const NOW = new Date("2026-11-20T10:00:00.000Z").getTime();
const MIN = 60_000;

const searching: QueueModalState = {
  status: "searching",
  alias: null,
  since: null,
};

describe("nextQueueModalState", () => {
  it("keeps a waiter searching with their alias", () => {
    const response: QueueResponse = {
      status: "waiting",
      alias: "quiet tanuki",
      since: new Date(NOW).toISOString(),
      expiresAt: new Date(NOW + 2 * MIN).toISOString(),
    };

    expect(nextQueueModalState(searching, response, NOW)).toEqual({
      status: "searching",
      alias: "quiet tanuki",
      since: response.since,
    });
  });

  it("moves to the room on a match", () => {
    const response: QueueResponse = {
      status: "matched",
      sessionId: "session-1",
      alias: "quiet tanuki",
    };

    expect(nextQueueModalState(searching, response, NOW)).toEqual({
      status: "matched",
      sessionId: "session-1",
    });
  });

  it("never leaves a match once the room exists", () => {
    const matched: QueueModalState = { status: "matched", sessionId: "s1" };
    const late: QueueResponse = {
      status: "waiting",
      alias: "quiet tanuki",
      since: new Date(NOW).toISOString(),
      expiresAt: new Date(NOW + 2 * MIN).toISOString(),
    };

    expect(nextQueueModalState(matched, late, NOW)).toBe(matched);
    expect(nextQueueModalState(matched, { status: "idle" }, NOW)).toBe(matched);
  });

  it("explains the cap with the minutes left", () => {
    const retryAt = new Date(NOW + 4 * MIN).toISOString();

    expect(
      nextQueueModalState(searching, { status: "limited", retryAt }, NOW)
    ).toEqual({ status: "limited", retryAt, minutes: 4 });
  });

  it("rounds the cap wait up to at least a minute", () => {
    const retryAt = new Date(NOW + 5_000).toISOString();

    expect(
      nextQueueModalState(searching, { status: "limited", retryAt }, NOW)
    ).toMatchObject({ minutes: 1 });
  });

  it("treats a reaped queue row as an expired search", () => {
    expect(nextQueueModalState(searching, { status: "idle" }, NOW)).toEqual({
      status: "error",
      reason: "expired",
    });
  });

  it("returns to searching after a retry", () => {
    const error: QueueModalState = { status: "error", reason: "network" };
    const waiting: QueueResponse = {
      status: "waiting",
      alias: "brave koi",
      since: new Date(NOW).toISOString(),
      expiresAt: new Date(NOW + 2 * MIN).toISOString(),
    };

    expect(nextQueueModalState(error, waiting, NOW)).toEqual({
      status: "searching",
      alias: "brave koi",
      since: waiting.since,
    });
  });
});
