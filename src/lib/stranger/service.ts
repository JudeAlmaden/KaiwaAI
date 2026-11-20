import { prisma } from "@/lib/prisma";
import { MAX_MESSAGE_CHARS, charLength } from "@/lib/types";
import { makeAlias } from "./alias";
import {
  STRANGER_MESSAGE_BURST,
  STRANGER_MESSAGE_WINDOW_MS,
  STRANGER_QUEUE_TTL_MS,
  STRANGER_ROOM_BURST,
  STRANGER_ROOM_WINDOW_MS,
  STRANGER_SESSION_IDLE_MS,
  STRANGER_SESSION_MAX_MS,
} from "./config";

export type StrangerMessageView = {
  id: string;
  body: string;
  alias: string;
  mine: boolean;
  createdAt: string;
};

export type StrangerSessionView = {
  session: {
    id: string;
    status: string;
    endReason: string | null;
    createdAt: string;
    endedAt: string | null;
    expiresAt: string;
  };
  me: { alias: string; leftAt: string | null };
  partner: { alias: string; leftAt: string | null; lastSeenAt: string } | null;
  messages: StrangerMessageView[];
};

export type QueueState =
  | { status: "idle" }
  | { status: "waiting"; alias: string; since: string; expiresAt: string }
  | { status: "matched"; sessionId: string; alias: string }
  | { status: "limited"; retryAt: string };

export type RoomAllowance =
  | { allowed: true }
  | { allowed: false; retryAt: string };

function serialize(
  row: {
    id: string;
    body: string;
    senderUserId: string;
    createdAt: Date;
    participant: { alias: string };
  },
  meId: string
): StrangerMessageView {
  return {
    id: row.id,
    body: row.body,
    alias: row.participant.alias,
    mine: row.senderUserId === meId,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * DB-backed cap on opening new rooms.
 *
 * The in-memory limiter in `rate-limiter.ts` is per process, so it means nothing
 * across Vercel instances. Counting the caller's own `StrangerParticipant` rows
 * instead is one indexed query (`@@index([userId, leftAt])`, plus `joinedAt` in
 * the filter) and holds everywhere. Reading the newest `STRANGER_ROOM_BURST`
 * rows also gives an exact `retryAt`: the moment the oldest of them leaves the
 * window.
 */
export async function roomAllowance(userId: string): Promise<RoomAllowance> {
  const now = Date.now();
  const recent = await prisma.strangerParticipant.findMany({
    where: {
      userId,
      joinedAt: { gte: new Date(now - STRANGER_ROOM_WINDOW_MS) },
    },
    orderBy: { joinedAt: "desc" },
    take: STRANGER_ROOM_BURST,
    select: { joinedAt: true },
  });
  if (recent.length < STRANGER_ROOM_BURST) return { allowed: true };

  const oldest = recent[recent.length - 1]?.joinedAt;
  if (!oldest) return { allowed: true };

  return {
    allowed: false,
    retryAt: new Date(oldest.getTime() + STRANGER_ROOM_WINDOW_MS).toISOString(),
  };
}

/**
 * A caller over the cap must not stay parked in the queue: their own poll would
 * retry the match and the next waiter's `tryMatch` would happily pair them.
 */
async function refuseNewRoom(userId: string, retryAt: string): Promise<QueueState> {
  await prisma.strangerQueueEntry.deleteMany({ where: { userId } });
  return { status: "limited", retryAt };
}

/** The room this user is currently in, if any. */
export async function findActiveSession(userId: string) {
  const now = new Date();
  const row = await prisma.strangerParticipant.findFirst({
    where: {
      userId,
      leftAt: null,
      session: { status: "active", expiresAt: { gt: now } },
    },
    orderBy: { joinedAt: "desc" },
    select: {
      sessionId: true,
      alias: true,
      session: { select: { createdAt: true, expiresAt: true } },
    },
  });
  if (!row) return null;
  return {
    sessionId: row.sessionId,
    alias: row.alias,
    since: row.session.createdAt.toISOString(),
    expiresAt: row.session.expiresAt.toISOString(),
  };
}

/**
 * Try to pair `userId` with the oldest compatible waiter.
 *
 * Claiming is one transaction: deleting the candidate's queue row proves this
 * caller won it (`count === 1`), then the session and both participants are
 * created. The partial unique index on live participants is the second line of
 * defence if a candidate raced into another room.
 */
async function tryMatch(userId: string, myAlias: string) {
  const now = new Date();

  const blocks = await prisma.strangerBlock.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const blocked = new Set<string>();
  for (const b of blocks) {
    blocked.add(b.blockerId === userId ? b.blockedId : b.blockerId);
  }

  const candidates = await prisma.strangerQueueEntry.findMany({
    where: { userId: { not: userId }, expiresAt: { gt: now } },
    orderBy: { createdAt: "asc" },
    take: 12,
  });

  for (const cand of candidates) {
    if (blocked.has(cand.userId)) continue;

    const busy = await prisma.strangerParticipant.findFirst({
      where: {
        userId: cand.userId,
        leftAt: null,
        session: { status: "active", expiresAt: { gt: now } },
      },
      select: { id: true },
    });
    if (busy) continue;

    try {
      const session = await prisma.$transaction(async (tx) => {
        const claimed = await tx.strangerQueueEntry.deleteMany({
          where: { id: cand.id },
        });
        if (claimed.count !== 1) return null;

        const created = await tx.strangerSession.create({
          data: {
            expiresAt: new Date(now.getTime() + STRANGER_SESSION_IDLE_MS),
            participants: {
              create: [
                { userId, alias: myAlias },
                { userId: cand.userId, alias: cand.alias },
              ],
            },
          },
        });
        await tx.strangerQueueEntry.deleteMany({ where: { userId } });
        return created;
      });
      if (session) return session;
    } catch (err) {
      // A lost race (candidate already paired) throws on the unique index; move
      // on to the next waiter instead of failing the whole request.
      console.error("stranger match attempt failed:", err);
    }
  }

  return null;
}

/** Join (or refresh) the queue and match immediately if someone is waiting. */
export async function joinQueue(userId: string): Promise<QueueState> {
  const active = await findActiveSession(userId);
  if (active) {
    return {
      status: "matched",
      sessionId: active.sessionId,
      alias: active.alias,
    };
  }

  const allowance = await roomAllowance(userId);
  if (!allowance.allowed) return refuseNewRoom(userId, allowance.retryAt);

  const now = new Date();
  const entry = await prisma.strangerQueueEntry.upsert({
    where: { userId },
    create: {
      userId,
      alias: makeAlias(),
      expiresAt: new Date(now.getTime() + STRANGER_QUEUE_TTL_MS),
    },
    update: {
      lastSeenAt: now,
      expiresAt: new Date(now.getTime() + STRANGER_QUEUE_TTL_MS),
    },
  });

  const session = await tryMatch(userId, entry.alias);
  if (session) {
    return { status: "matched", sessionId: session.id, alias: entry.alias };
  }

  return {
    status: "waiting",
    alias: entry.alias,
    since: entry.createdAt.toISOString(),
    expiresAt: entry.expiresAt.toISOString(),
  };
}

/** Poll the queue; also retries the match so a late-arriving partner is found. */
export async function queueState(userId: string): Promise<QueueState> {
  const active = await findActiveSession(userId);
  if (active) {
    return {
      status: "matched",
      sessionId: active.sessionId,
      alias: active.alias,
    };
  }

  const allowance = await roomAllowance(userId);
  if (!allowance.allowed) return refuseNewRoom(userId, allowance.retryAt);

  const entry = await prisma.strangerQueueEntry.findUnique({
    where: { userId },
  });
  if (!entry) return { status: "idle" };

  if (entry.expiresAt.getTime() <= Date.now()) {
    await prisma.strangerQueueEntry.deleteMany({ where: { userId } });
    return { status: "idle" };
  }

  const session = await tryMatch(userId, entry.alias);
  if (session) {
    return { status: "matched", sessionId: session.id, alias: entry.alias };
  }

  return {
    status: "waiting",
    alias: entry.alias,
    since: entry.createdAt.toISOString(),
    expiresAt: entry.expiresAt.toISOString(),
  };
}

export async function leaveQueue(userId: string) {
  await prisma.strangerQueueEntry.deleteMany({ where: { userId } });
}

export async function getSessionView(
  userId: string,
  sessionId: string,
  afterId?: string
): Promise<StrangerSessionView | null> {
  const me = await prisma.strangerParticipant.findFirst({
    where: { sessionId, userId },
    include: { session: true },
  });
  if (!me) return null;

  // Presence is only useful for "other person is here"; don't write on every
  // 2 s poll.
  const now = new Date();
  if (now.getTime() - me.lastSeenAt.getTime() > 30_000) {
    await prisma.strangerParticipant.update({
      where: { id: me.id },
      data: { lastSeenAt: now },
    });
  }

  const partner = await prisma.strangerParticipant.findFirst({
    where: { sessionId, userId: { not: userId } },
    orderBy: { joinedAt: "asc" },
  });

  let rows;
  if (afterId) {
    const cursor = await prisma.strangerMessage.findUnique({
      where: { id: afterId },
      select: { createdAt: true },
    });
    rows = await prisma.strangerMessage.findMany({
      where: {
        sessionId,
        ...(cursor ? { createdAt: { gt: cursor.createdAt } } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: { participant: { select: { alias: true } } },
    });
  } else {
    rows = (
      await prisma.strangerMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { participant: { select: { alias: true } } },
      })
    ).reverse();
  }

  return {
    session: {
      id: me.session.id,
      status: me.session.status,
      endReason: me.session.endReason,
      createdAt: me.session.createdAt.toISOString(),
      endedAt: me.session.endedAt?.toISOString() ?? null,
      expiresAt: me.session.expiresAt.toISOString(),
    },
    me: { alias: me.alias, leftAt: me.leftAt?.toISOString() ?? null },
    partner: partner
      ? {
          alias: partner.alias,
          leftAt: partner.leftAt?.toISOString() ?? null,
          lastSeenAt: partner.lastSeenAt.toISOString(),
        }
      : null,
    messages: rows.map((m) => serialize(m, userId)),
  };
}

export type PostMessageResult =
  | { ok: true; message: StrangerMessageView }
  | { ok: false; code: "empty" | "too-long" | "rate-limited" | "not-found" };

export async function postMessage(
  userId: string,
  sessionId: string,
  raw: string
): Promise<PostMessageResult> {
  const body = raw.trim();
  if (!body) return { ok: false, code: "empty" };
  if (charLength(body) > MAX_MESSAGE_CHARS) {
    return { ok: false, code: "too-long" };
  }

  const me = await prisma.strangerParticipant.findFirst({
    where: { sessionId, userId },
    include: { session: true },
  });
  if (!me || me.leftAt) return { ok: false, code: "not-found" };

  const session = me.session;
  if (session.status !== "active" || session.expiresAt.getTime() <= Date.now()) {
    return { ok: false, code: "not-found" };
  }

  const burst = await prisma.strangerMessage.count({
    where: {
      senderUserId: userId,
      createdAt: {
        gte: new Date(Date.now() - STRANGER_MESSAGE_WINDOW_MS),
      },
    },
  });
  if (burst >= STRANGER_MESSAGE_BURST) {
    return { ok: false, code: "rate-limited" };
  }

  const now = new Date();
  const idleDeadline = now.getTime() + STRANGER_SESSION_IDLE_MS;
  const hardDeadline = session.createdAt.getTime() + STRANGER_SESSION_MAX_MS;

  const row = await prisma.strangerMessage.create({
    data: {
      sessionId,
      participantId: me.id,
      senderUserId: userId,
      body,
    },
    include: { participant: { select: { alias: true } } },
  });

  await prisma.strangerSession.updateMany({
    where: { id: sessionId, status: "active" },
    data: {
      lastMessageAt: now,
      expiresAt: new Date(Math.min(idleDeadline, hardDeadline)),
    },
  });

  return { ok: true, message: serialize(row, userId) };
}

/**
 * Leave or skip. Either side leaving ends the room for both, but nothing is
 * deleted here — the transcript stays readable until the reaper takes it, so
 * the remaining side sees "they left" rather than an empty screen.
 */
export async function leaveSession(
  userId: string,
  sessionId: string,
  reason: "skip" | "leave"
) {
  const me = await prisma.strangerParticipant.findFirst({
    where: { sessionId, userId },
    select: { id: true, leftAt: true },
  });
  if (!me) return false;

  if (!me.leftAt) {
    await prisma.strangerParticipant.update({
      where: { id: me.id },
      data: { leftAt: new Date(), leftReason: reason },
    });
  }

  await prisma.strangerSession.updateMany({
    where: { id: sessionId, status: "active" },
    data: { status: "ended", endedAt: new Date(), endReason: reason },
  });

  return true;
}
