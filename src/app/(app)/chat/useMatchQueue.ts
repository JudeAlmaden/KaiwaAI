"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  nextQueueModalState,
  type QueueModalState,
  type QueueResponse,
} from "./strangers/queue-state";

const POLL_MS = 2000;
// A match is transient: show it, then hand over to the room.
const MATCH_HANDOFF_MS = 450;

export type MatchQueueState = { status: "idle" } | QueueModalState;

/**
 * Matching lifecycle for the inbox. Mounted by `InboxProvider`, so the queue
 * survives moving between conversations inside `/chat` instead of being torn
 * down with a dialog; only leaving the `/chat` subtree cancels it.
 *
 * `start` is idempotent: an already searching or matched queue ignores it.
 */
export function useMatchQueue({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<MatchQueueState>({ status: "idle" });
  const running = useRef(false);
  const interval = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const stop = useCallback(() => {
    if (interval.current) clearInterval(interval.current);
    interval.current = undefined;
  }, []);

  const apply = useCallback((response: QueueResponse) => {
    setState((current) =>
      current.status === "idle"
        ? current
        : nextQueueModalState(current, response)
    );
  }, []);

  const tick = useCallback(async () => {
    if (!running.current) return;

    // A hidden tab stops asking; the queue TTL covers the gap.
    if (typeof document !== "undefined" && document.hidden) return;

    let terminal = false;
    try {
      const res = await fetch("/api/stranger/queue");
      if (!running.current) return;
      if (res.ok) {
        const data = (await res.json()) as QueueResponse;
        apply(data);
        terminal = data.status === "matched" || data.status === "limited";
      }
    } catch {
      // transient; the next tick usually recovers
    }

    if (terminal) {
      running.current = false;
      stop();
    }
  }, [apply, stop]);

  const start = useCallback(async () => {
    if (!enabled || running.current) return;
    running.current = true;
    stop();
    setState({ status: "searching", alias: null, since: null });

    let shouldPoll = true;
    try {
      const res = await fetch("/api/stranger/queue", { method: "POST" });
      if (!running.current) return;
      if (!res.ok) {
        running.current = false;
        setState({ status: "error", reason: "network" });
        return;
      }
      const data = (await res.json()) as QueueResponse;
      apply(data);
      if (data.status === "matched" || data.status === "limited") {
        running.current = false;
        shouldPoll = false;
      }
    } catch {
      if (running.current) {
        running.current = false;
        setState({ status: "error", reason: "network" });
      }
      return;
    }

    if (shouldPoll && running.current) {
      interval.current = setInterval(() => void tick(), POLL_MS);
    }
  }, [apply, enabled, stop, tick]);

  const retry = useCallback(() => {
    running.current = false;
    stop();
    void start();
  }, [start, stop]);

  const cancel = useCallback(async () => {
    running.current = false;
    stop();
    setState({ status: "idle" });
    try {
      await fetch("/api/stranger/queue", { method: "DELETE" });
    } catch {
      // best effort; the entry expires on its own
    }
  }, [stop]);

  // A match opens the room after a beat so the row can say "found someone".
  useEffect(() => {
    if (state.status !== "matched") return;
    const sessionId = state.sessionId;
    const id = setTimeout(() => {
      running.current = false;
      router.push(`/chat/strangers/${sessionId}`);
    }, MATCH_HANDOFF_MS);
    return () => clearTimeout(id);
  }, [state, router]);

  // Leaving the `/chat` subtree (the provider unmounts) drops the queue row, so
  // a queue never exists while the learner is on another screen.
  useEffect(() => {
    return () => {
      const wasRunning = running.current;
      running.current = false;
      if (interval.current) clearInterval(interval.current);
      if (wasRunning) {
        void fetch("/api/stranger/queue", { method: "DELETE" }).catch(() => {});
      }
    };
  }, []);

  return { state, start, retry, cancel };
}
