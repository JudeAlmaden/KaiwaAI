import { prisma } from "@/lib/prisma";
import {
  STRANGER_CLEANUP_INTERVAL_MS,
  STRANGER_ENDED_RETENTION_MS,
} from "./config";

export type StrangerCleanupResult = {
  queue: number;
  endedSessions: number;
  expiredSessions: number;
};

/**
 * Delete everything past its TTL.
 *
 * No scheduler and no advisory lock: every statement is an idempotent DELETE
 * whose predicate re-checks the timestamp, so two server instances running at
 * once just do the same work twice. That also avoids holding a session-scoped
 * lock through the pgbouncer transaction pooler.
 */
export async function runStrangerCleanup(): Promise<StrangerCleanupResult> {
  const now = new Date();
  const endedBefore = new Date(now.getTime() - STRANGER_ENDED_RETENTION_MS);

  const queue = await prisma.strangerQueueEntry.deleteMany({
    where: { expiresAt: { lt: now } },
  });

  // Ended rooms linger briefly so a partner can still read "they left"; expired
  // or old rooms go entirely (participants, messages and reports cascade).
  const endedSessions = await prisma.strangerSession.deleteMany({
    where: { status: "ended", endedAt: { lt: endedBefore } },
  });
  const expiredSessions = await prisma.strangerSession.deleteMany({
    where: { expiresAt: { lt: now } },
  });

  return {
    queue: queue.count,
    endedSessions: endedSessions.count,
    expiredSessions: expiredSessions.count,
  };
}

const globalForStrangerCleanup = globalThis as unknown as {
  strangerCleanupAt?: number;
};

/**
 * Fire-and-forget reaper, called from the queue/session routes. Throttled per
 * server instance so ordinary traffic pays one cheap timestamp check.
 */
export function maybeRunStrangerCleanup() {
  const now = Date.now();
  const last = globalForStrangerCleanup.strangerCleanupAt;
  if (last && now - last < STRANGER_CLEANUP_INTERVAL_MS) return;
  globalForStrangerCleanup.strangerCleanupAt = now;
  void runStrangerCleanup().catch((err) => {
    console.error("stranger cleanup failed:", err);
  });
}
