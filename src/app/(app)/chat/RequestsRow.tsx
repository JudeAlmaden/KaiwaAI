"use client";

import { usePeopleContext } from "./InboxProvider";

/**
 * One row for everything waiting on you (friend requests + group invites) so the
 * conversation list is not pushed down by inline request cards.
 */
export default function RequestsRow({ onOpen }: { onOpen: () => void }) {
  const { pending } = usePeopleContext();
  if (pending <= 0) return null;

  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-2 rounded-2xl border-2 border-sakura/30 bg-sakura/5 px-3 py-2 text-left transition-colors hover:border-sakura"
    >
      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-sakura px-1.5 text-[11px] font-bold text-white">
        {pending}
      </span>
      <span className="text-sm font-bold">
        {pending === 1 ? "1 request" : `${pending} requests`}
      </span>
      <span className="ml-auto text-indigo-ai">→</span>
    </button>
  );
}
