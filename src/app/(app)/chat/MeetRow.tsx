"use client";

import { useEffect, useState } from "react";
import { useMatchQueueContext } from "./InboxProvider";

/**
 * Matching entry point at the bottom of the conversation list: same row anatomy
 * as a chat, so starting a stranger match is one tap from the inbox instead of
 * only living in the People sheet.
 */
export default function MeetRow({
  strangerEnabled = false,
}: {
  strangerEnabled?: boolean;
}) {
  const { state, start } = useMatchQueueContext();
  const [online, setOnline] = useState<number | null>(null);

  useEffect(() => {
    if (!strangerEnabled) return;
    let cancelled = false;
    fetch("/api/stranger/online")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && typeof d?.online === "number") setOnline(d.online);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [strangerEnabled]);

  if (!strangerEnabled) return null;

  const searching = state.status === "searching";
  const hint = searching
    ? "Looking for someone…"
    : online === null
      ? "Anonymous, text only"
      : online > 1
        ? `${online} around now`
        : "You're the only one here";

  return (
    <button
      onClick={() => void start()}
      disabled={searching}
      className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-indigo-ai/30 bg-card px-3.5 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-indigo-ai hover:shadow-md disabled:opacity-70 disabled:hover:translate-y-0"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-ai/10 text-xl ring-1 ring-indigo-ai/20">
        🌍
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">Meet someone new</span>
        <span className="mt-0.5 block truncate text-xs text-muted">{hint}</span>
      </span>
      <span className="shrink-0 text-indigo-ai" aria-hidden="true">
        →
      </span>
    </button>
  );
}
