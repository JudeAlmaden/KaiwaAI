"use client";

import { useEffect, useState } from "react";
import { useMatchQueueContext } from "./InboxProvider";

/**
 * The matching state as a row in the inbox instead of a modal: browsing other
 * conversations does not cancel the search, and the match still opens the room.
 */
export default function QueueRow() {
  const { state, retry, cancel } = useMatchQueueContext();
  const [now, setNow] = useState(() => Date.now());

  const searching = state.status === "searching";

  useEffect(() => {
    if (!searching) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [searching]);

  if (state.status === "idle") return null;

  const elapsed =
    state.status === "searching" && state.since
      ? Math.max(0, Math.floor((now - new Date(state.since).getTime()) / 1000))
      : 0;
  const clock = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

  const title =
    state.status === "matched"
      ? "Found someone!"
      : state.status === "limited"
        ? "Take a breather"
        : state.status === "error"
          ? "Couldn't start the search"
          : "Looking for someone…";

  const description =
    state.status === "matched"
      ? "Opening the room…"
      : state.status === "limited"
        ? `The door reopens in about ${state.minutes} min.`
        : state.status === "error"
          ? state.reason === "expired"
            ? "That search timed out."
            : "Couldn't reach the queue."
          : state.alias
            ? `You're “${state.alias}” in this chat.`
            : "You're both anonymous.";

  return (
    <div className="flex items-center gap-3 rounded-2xl border-2 border-indigo-ai/30 bg-indigo-ai/5 px-3.5 py-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-ai/10 text-base ring-2 ring-indigo-ai/20 ${
          searching ? "animate-pulse motion-reduce:animate-none" : ""
        }`}
        aria-hidden="true"
      >
        🌍
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{title}</span>
        <span
          role="status"
          aria-live="polite"
          className="mt-0.5 block truncate text-xs text-muted"
        >
          {description}
          {searching && ` ${clock}`}
        </span>
      </span>

      {state.status === "error" && (
        <button
          onClick={retry}
          className="shrink-0 rounded-full bg-indigo-ai px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-indigo-deep"
        >
          Try again
        </button>
      )}

      {state.status !== "matched" && (
        <button
          onClick={() => void cancel()}
          className="shrink-0 rounded-full border-2 border-border px-3 py-1.5 text-[11px] font-bold text-muted transition-colors hover:border-indigo-ai hover:text-indigo-ai"
          aria-label="Cancel matching"
        >
          {state.status === "searching" ? "Cancel" : "Close"}
        </button>
      )}
    </div>
  );
}
