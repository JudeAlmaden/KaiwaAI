import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const NOW = new Date("2026-11-20T10:00:00.000Z");
const MIN = 60_000;

const db = vi.hoisted(() => ({
  queue: { deleteMany: vi.fn() },
  session: { deleteMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    strangerQueueEntry: db.queue,
    strangerSession: db.session,
  },
}));

import { maybeRunStrangerCleanup, runStrangerCleanup } from "./cleanup";

const globals = globalThis as unknown as { strangerCleanupAt?: number };

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

beforeEach(() => {
  // Only Date is faked: the throttle reads Date.now(), while `flush` needs the
  // real setImmediate to drain the fire-and-forget promise chain.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.clearAllMocks();
  globals.strangerCleanupAt = undefined;
  db.queue.deleteMany.mockResolvedValue({ count: 2 });
  db.session.deleteMany.mockResolvedValue({ count: 1 });
});

afterEach(() => {
  vi.useRealTimers();
  globals.strangerCleanupAt = undefined;
});

describe("runStrangerCleanup", () => {
  it("reaps expired queue rows, stale ended rooms and expired rooms", async () => {
    await expect(runStrangerCleanup()).resolves.toEqual({
      queue: 2,
      endedSessions: 1,
      expiredSessions: 1,
    });

    expect(db.queue.deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lt: NOW } },
    });
    expect(db.session.deleteMany).toHaveBeenNthCalledWith(1, {
      where: {
        status: "ended",
        endedAt: { lt: new Date(NOW.getTime() - 10 * MIN) },
      },
    });
    expect(db.session.deleteMany).toHaveBeenNthCalledWith(2, {
      where: { expiresAt: { lt: NOW } },
    });
  });
});

describe("maybeRunStrangerCleanup", () => {
  it("runs at most once a minute per server instance", async () => {
    maybeRunStrangerCleanup();
    await flush();
    expect(db.session.deleteMany).toHaveBeenCalledTimes(2);

    maybeRunStrangerCleanup();
    await flush();
    expect(db.session.deleteMany).toHaveBeenCalledTimes(2);

    vi.setSystemTime(new Date(NOW.getTime() + 61_000));
    maybeRunStrangerCleanup();
    await flush();
    expect(db.session.deleteMany).toHaveBeenCalledTimes(4);
  });
});
