"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  nextQueueModalState,
  type QueueModalState,
  type QueueResponse,
} from "./queue-state";

const POLL_MS = 2000;

/**
 * Matching lifecycle for the queue dialog: one POST when it opens, then a 2 s
 * GET until a match, a cap refusal or the user cancels. Closing the dialog
 * unmounts the hook, which aborts polling and (via `cancel`) drops the row — a
 * queue never exists while the learner is looking at something else.
 */
export function useStrangerQueue() {
  const [state, setState] = useState<QueueModalState>({
    status: "searching",
    alias: null,
    since: null,
  });
  const cancelledRef = useRef(false);
  const beginRef = useRef<() => void>(() => {});

  const apply = useCallback((response: QueueResponse) => {
    if (cancelledRef.current) return;
    setState((current) => nextQueueModalState(current, response));
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      if (cancelledRef.current) return;

      // A hidden tab stops asking; the wait TTL covers the gap.
      if (typeof document !== "undefined" && document.hidden) {
        timer = setTimeout(poll, POLL_MS);
        return;
      }

      let terminal = false;
      try {
        const res = await fetch("/api/stranger/queue");
        if (cancelledRef.current) return;
        if (res.ok) {
          const d = (await res.json()) as QueueResponse;
          apply(d);
          terminal = d.status === "matched" || d.status === "limited";
        }
      } catch {
        // transient; the next tick usually recovers
      }

      if (cancelledRef.current || terminal) return;
      timer = setTimeout(poll, POLL_MS);
    };

    const begin = async () => {
      try {
        const res = await fetch("/api/stranger/queue", { method: "POST" });
        if (cancelledRef.current) return;
        if (!res.ok) {
          setState({ status: "error", reason: "network" });
          return;
        }
        const d = (await res.json()) as QueueResponse;
        if (cancelledRef.current) return;
        apply(d);
        if (d.status === "matched" || d.status === "limited") return;
      } catch {
        if (!cancelledRef.current) {
          setState({ status: "error", reason: "network" });
        }
        return;
      }
      timer = setTimeout(poll, POLL_MS);
    };

    beginRef.current = () => {
      void begin();
    };
    void begin();

    return () => {
      cancelledRef.current = true;
      if (timer) clearTimeout(timer);
    };
  }, [apply]);

  const retry = useCallback(() => {
    setState({ status: "searching", alias: null, since: null });
    beginRef.current();
  }, []);

  const cancel = useCallback(async () => {
    cancelledRef.current = true;
    try {
      await fetch("/api/stranger/queue", { method: "DELETE" });
    } catch {
      // best effort; the entry expires in two minutes anyway
    }
  }, []);

  return { state, retry, cancel };
}
