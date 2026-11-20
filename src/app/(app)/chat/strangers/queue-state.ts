// Client-side queue states for the matching dialog.
//
// The server's `QueueState` lives in `src/lib/stranger/service.ts`, which imports
// Prisma and therefore can't be pulled into a client bundle, so the wire shape is
// mirrored here. `nextQueueModalState` is pure so the transitions can be tested
// without React or a network.

export type QueueResponse =
  | { status: "idle" }
  | { status: "waiting"; alias: string; since: string; expiresAt: string }
  | { status: "matched"; sessionId: string; alias: string }
  | { status: "limited"; retryAt: string };

export type QueueModalState =
  | { status: "searching"; alias: string | null; since: string | null }
  | { status: "matched"; sessionId: string }
  | { status: "limited"; retryAt: string; minutes: number }
  | { status: "error"; reason: "network" | "expired" };

/**
 * Fold one queue response into the dialog's state.
 *
 * A match is sticky: once the room exists, a late `waiting`/`idle` must not drag
 * the dialog back into searching while it is handing over to the room.
 */
export function nextQueueModalState(
  current: QueueModalState,
  response: QueueResponse,
  now: number = Date.now()
): QueueModalState {
  if (current.status === "matched") return current;

  if (response.status === "idle") {
    // The 2 minute queue TTL reaped the row before a partner arrived.
    return { status: "error", reason: "expired" };
  }
  if (response.status === "waiting") {
    return { status: "searching", alias: response.alias, since: response.since };
  }
  if (response.status === "limited") {
    return {
      status: "limited",
      retryAt: response.retryAt,
      minutes: Math.max(
        1,
        Math.ceil((new Date(response.retryAt).getTime() - now) / 60_000)
      ),
    };
  }
  return { status: "matched", sessionId: response.sessionId };
}
