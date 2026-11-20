import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const NOW = new Date("2026-11-20T10:00:00.000Z");
const MIN = 60_000;

const db = vi.hoisted(() => {
  const participant = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  };
  const queueEntry = {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  };
  const block = { findMany: vi.fn() };
  const session = { create: vi.fn(), updateMany: vi.fn() };
  const message = {
    create: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  };
  const tx = {
    strangerQueueEntry: { deleteMany: vi.fn() },
    strangerSession: { create: vi.fn() },
  };
  const transaction = vi.fn();
  return { participant, queueEntry, block, session, message, tx, transaction };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    strangerParticipant: db.participant,
    strangerQueueEntry: db.queueEntry,
    strangerBlock: db.block,
    strangerSession: db.session,
    strangerMessage: db.message,
    $transaction: db.transaction,
  },
}));

// The alias generator is random; pin it so assertions can name the row.
vi.mock("./alias", () => ({ makeAlias: () => "quiet tanuki" }));

import {
  joinQueue,
  queueState,
  getSessionView,
  postMessage,
  leaveSession,
  roomAllowance,
  type QueueState,
} from "./service";

type Limited = Extract<QueueState, { status: "limited" }>;

function entry(overrides: Record<string, unknown> = {}) {
  return {
    id: "q-me",
    userId: "me",
    alias: "quiet tanuki",
    createdAt: NOW,
    lastSeenAt: NOW,
    expiresAt: new Date(NOW.getTime() + 2 * MIN),
    ...overrides,
  };
}

function activeSeat(overrides: Record<string, unknown> = {}) {
  return {
    id: "p-me",
    alias: "quiet tanuki",
    leftAt: null,
    session: {
      id: "session-1",
      status: "active",
      createdAt: new Date(NOW.getTime() - 5 * MIN),
      expiresAt: new Date(NOW.getTime() + 25 * MIN),
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.clearAllMocks();

  db.transaction.mockImplementation(
    async (fn: (tx: typeof db.tx) => Promise<unknown>) => fn(db.tx)
  );
  db.participant.findFirst.mockResolvedValue(null);
  db.participant.findMany.mockResolvedValue([]);
  db.participant.update.mockResolvedValue({});
  db.queueEntry.findUnique.mockResolvedValue(null);
  db.queueEntry.findMany.mockResolvedValue([]);
  db.queueEntry.deleteMany.mockResolvedValue({ count: 0 });
  db.block.findMany.mockResolvedValue([]);
  db.session.updateMany.mockResolvedValue({ count: 1 });
  db.message.count.mockResolvedValue(0);
  db.tx.strangerQueueEntry.deleteMany.mockResolvedValue({ count: 1 });
  db.tx.strangerSession.create.mockResolvedValue({ id: "session-1" });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("matchmaking", () => {
  it("waits when nobody else is in the queue", async () => {
    const mine = entry();
    db.queueEntry.upsert.mockResolvedValue(mine);

    await expect(joinQueue("me")).resolves.toEqual({
      status: "waiting",
      alias: "quiet tanuki",
      since: NOW.toISOString(),
      expiresAt: mine.expiresAt.toISOString(),
    });
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("pairs with the oldest waiter and seats both aliases", async () => {
    db.queueEntry.upsert.mockResolvedValue(entry());
    db.queueEntry.findMany.mockResolvedValue([
      entry({ id: "q-them", userId: "them", alias: "brave koi" }),
    ]);

    await expect(joinQueue("me")).resolves.toEqual({
      status: "matched",
      sessionId: "session-1",
      alias: "quiet tanuki",
    });

    const created = db.tx.strangerSession.create.mock.calls[0][0];
    expect(created.data.participants.create).toEqual([
      { userId: "me", alias: "quiet tanuki" },
      { userId: "them", alias: "brave koi" },
    ]);
    expect(db.tx.strangerQueueEntry.deleteMany).toHaveBeenCalledWith({
      where: { id: "q-them" },
    });
    expect(db.tx.strangerQueueEntry.deleteMany).toHaveBeenLastCalledWith({
      where: { userId: "me" },
    });
  });

  it("never pairs two people who blocked each other", async () => {
    db.queueEntry.upsert.mockResolvedValue(entry());
    db.queueEntry.findMany.mockResolvedValue([
      entry({ id: "q-blocker", userId: "blocker", alias: "grey heron" }),
      entry({ id: "q-other", userId: "other", alias: "brave koi" }),
    ]);
    db.block.findMany.mockResolvedValue([
      { blockerId: "blocker", blockedId: "me" },
    ]);

    await expect(joinQueue("me")).resolves.toMatchObject({
      status: "matched",
    });
    const created = db.tx.strangerSession.create.mock.calls[0][0];
    expect(created.data.participants.create[1]).toEqual({
      userId: "other",
      alias: "brave koi",
    });
  });

  it("skips a waiter who is already in another room", async () => {
    db.queueEntry.upsert.mockResolvedValue(entry());
    db.queueEntry.findMany.mockResolvedValue([
      entry({ id: "q-busy", userId: "busy", alias: "grey heron" }),
      entry({ id: "q-free", userId: "free", alias: "brave koi" }),
    ]);
    db.participant.findFirst.mockImplementation(
      async ({ where }: { where: { userId?: string } }) =>
        where.userId === "busy" ? { id: "p-busy" } : null
    );

    await expect(joinQueue("me")).resolves.toMatchObject({
      status: "matched",
    });
    const created = db.tx.strangerSession.create.mock.calls[0][0];
    expect(created.data.participants.create[1]).toEqual({
      userId: "free",
      alias: "brave koi",
    });
  });

  it("moves on when a claim is lost to another instance", async () => {
    db.queueEntry.upsert.mockResolvedValue(entry());
    db.queueEntry.findMany.mockResolvedValue([
      entry({ id: "q-first", userId: "first" }),
      entry({ id: "q-second", userId: "second" }),
    ]);
    // First claim loses the row, second wins it.
    db.tx.strangerQueueEntry.deleteMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValue({ count: 1 });

    await expect(joinQueue("me")).resolves.toMatchObject({
      status: "matched",
      sessionId: "session-1",
    });
    expect(db.tx.strangerQueueEntry.deleteMany).toHaveBeenNthCalledWith(1, {
      where: { id: "q-first" },
    });
  });

  it("keeps waiting when every claim is lost", async () => {
    db.queueEntry.upsert.mockResolvedValue(entry());
    db.queueEntry.findMany.mockResolvedValue([
      entry({ id: "q-first", userId: "first" }),
    ]);
    db.tx.strangerQueueEntry.deleteMany.mockResolvedValue({ count: 0 });

    await expect(joinQueue("me")).resolves.toMatchObject({
      status: "waiting",
    });
    expect(db.tx.strangerSession.create).not.toHaveBeenCalled();
  });

  it("returns the room the caller is already in instead of queueing", async () => {
    db.participant.findFirst.mockResolvedValue({
      sessionId: "session-9",
      alias: "quiet tanuki",
      session: {
        createdAt: NOW,
        expiresAt: new Date(NOW.getTime() + 30 * MIN),
      },
    });

    await expect(joinQueue("me")).resolves.toEqual({
      status: "matched",
      sessionId: "session-9",
      alias: "quiet tanuki",
    });
    expect(db.queueEntry.upsert).not.toHaveBeenCalled();
  });

  it("refuses new rooms past the DB-backed cap", async () => {
    const recent = Array.from({ length: 6 }, (_, i) => ({
      joinedAt: new Date(NOW.getTime() - i * MIN),
    }));
    db.participant.findMany.mockResolvedValue(recent);

    const state = (await joinQueue("me")) as Limited;

    expect(state.status).toBe("limited");
    expect(state.retryAt).toBe(
      new Date(recent[5].joinedAt.getTime() + 10 * MIN).toISOString()
    );
    expect(db.queueEntry.upsert).not.toHaveBeenCalled();
    // A capped caller must not be left parked in the queue.
    expect(db.queueEntry.deleteMany).toHaveBeenCalledWith({
      where: { userId: "me" },
    });
  });

  it("allows a new room below the cap", async () => {
    db.participant.findMany.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({
        joinedAt: new Date(NOW.getTime() - i * MIN),
      }))
    );
    db.queueEntry.upsert.mockResolvedValue(entry());

    await expect(joinQueue("me")).resolves.toMatchObject({
      status: "waiting",
    });
    expect(db.queueEntry.upsert).toHaveBeenCalledOnce();
  });

  it("counts the caller's own rooms in the database", async () => {
    await roomAllowance("me");

    expect(db.participant.findMany).toHaveBeenCalledWith({
      where: {
        userId: "me",
        joinedAt: { gte: new Date(NOW.getTime() - 10 * MIN) },
      },
      orderBy: { joinedAt: "desc" },
      take: 6,
      select: { joinedAt: true },
    });
  });
});

describe("expiry", () => {
  it("drops an expired queue entry and returns to idle", async () => {
    db.queueEntry.findUnique.mockResolvedValue(
      entry({ expiresAt: new Date(NOW.getTime() - 1000) })
    );

    await expect(queueState("me")).resolves.toEqual({ status: "idle" });
    expect(db.queueEntry.deleteMany).toHaveBeenCalledWith({
      where: { userId: "me" },
    });
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("pairs a partner who arrived after the join", async () => {
    db.queueEntry.findUnique.mockResolvedValue(entry());
    db.queueEntry.findMany.mockResolvedValue([
      entry({ id: "q-them", userId: "them", alias: "brave koi" }),
    ]);

    await expect(queueState("me")).resolves.toEqual({
      status: "matched",
      sessionId: "session-1",
      alias: "quiet tanuki",
    });
  });

  it("reports the cap on the poll as well as on join", async () => {
    db.queueEntry.findUnique.mockResolvedValue(entry());
    db.participant.findMany.mockResolvedValue(
      Array.from({ length: 6 }, (_, i) => ({
        joinedAt: new Date(NOW.getTime() - i * MIN),
      }))
    );

    await expect(queueState("me")).resolves.toMatchObject({
      status: "limited",
    });
    expect(db.queueEntry.deleteMany).toHaveBeenCalledWith({
      where: { userId: "me" },
    });
  });

  it("only reads rooms the caller is seated in", async () => {
    await expect(getSessionView("me", "session-1")).resolves.toBeNull();
    expect(db.message.findMany).not.toHaveBeenCalled();
  });

  it("refuses messages in a room past its deadline", async () => {
    db.participant.findFirst.mockResolvedValue(
      activeSeat({
        session: {
          id: "session-1",
          status: "active",
          createdAt: new Date(NOW.getTime() - 40 * MIN),
          expiresAt: new Date(NOW.getTime() - 1000),
        },
      })
    );

    await expect(postMessage("me", "session-1", "hi")).resolves.toEqual({
      ok: false,
      code: "not-found",
    });
    expect(db.message.create).not.toHaveBeenCalled();
  });

  it("extends the idle deadline only as far as the 2 h cap", async () => {
    const createdAt = new Date(NOW.getTime() - 115 * MIN);
    db.participant.findFirst.mockResolvedValue(
      activeSeat({
        session: {
          id: "session-1",
          status: "active",
          createdAt,
          expiresAt: new Date(NOW.getTime() + 5 * MIN),
        },
      })
    );
    db.message.create.mockResolvedValue({
      id: "m1",
      body: "hi",
      senderUserId: "me",
      createdAt: NOW,
      participant: { alias: "quiet tanuki" },
    });

    const result = await postMessage("me", "session-1", "hi");

    expect(result.ok).toBe(true);
    expect(db.session.updateMany.mock.calls[0][0].data.expiresAt).toEqual(
      new Date(createdAt.getTime() + 120 * MIN)
    );
  });

  it("rate-limits a burst counted in the database", async () => {
    db.participant.findFirst.mockResolvedValue(activeSeat());
    db.message.count.mockResolvedValue(8);

    await expect(postMessage("me", "session-1", "hi")).resolves.toEqual({
      ok: false,
      code: "rate-limited",
    });
    expect(db.message.create).not.toHaveBeenCalled();
  });
});

describe("leave", () => {
  it("ends the room for both sides and keeps the transcript", async () => {
    db.participant.findFirst.mockResolvedValue({ id: "p-me", leftAt: null });

    await expect(leaveSession("me", "session-1", "skip")).resolves.toBe(true);

    expect(db.participant.update).toHaveBeenCalledWith({
      where: { id: "p-me" },
      data: { leftAt: expect.any(Date), leftReason: "skip" },
    });
    expect(db.session.updateMany).toHaveBeenCalledWith({
      where: { id: "session-1", status: "active" },
      data: {
        status: "ended",
        endedAt: expect.any(Date),
        endReason: "skip",
      },
    });
  });

  it("does not re-stamp a side that already left", async () => {
    db.participant.findFirst.mockResolvedValue({
      id: "p-me",
      leftAt: new Date(NOW.getTime() - MIN),
    });

    await expect(leaveSession("me", "session-1", "leave")).resolves.toBe(true);
    expect(db.participant.update).not.toHaveBeenCalled();
    expect(db.session.updateMany).toHaveBeenCalledOnce();
  });

  it("refuses to leave someone else's room", async () => {
    await expect(leaveSession("me", "session-1", "leave")).resolves.toBe(false);
    expect(db.participant.update).not.toHaveBeenCalled();
    expect(db.session.updateMany).not.toHaveBeenCalled();
  });
});
