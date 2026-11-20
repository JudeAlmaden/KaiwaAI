"use client";

import { useEffect, useState } from "react";

// Matching, kept in the rail so strangers are one page away instead of a route.
export default function RailMeetSection({ onMeet }: { onMeet: () => void }) {
  const [online, setOnline] = useState<number | null>(null);

  useEffect(() => {
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
  }, []);

  return (
    <div className="rounded-3xl border-2 border-indigo-ai/25 bg-card p-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-ai/10 text-2xl ring-2 ring-indigo-ai/20">
        🌍
      </div>
      <p className="mt-3 font-display text-base font-extrabold">Meet a stranger</p>
      <p className="mt-1 text-sm text-muted">
        One-on-one, text only. Both anonymous, skip any time.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-mint/10 px-2.5 py-1 text-[11px] font-bold text-mint">
          {online === null
            ? "Checking who's around…"
            : online > 1
              ? `${online} around now`
              : "You're the only one here"}
        </span>
        <span className="rounded-full bg-indigo-ai/10 px-2.5 py-1 text-[11px] font-bold text-indigo-ai">
          text only
        </span>
      </div>
      <button
        onClick={onMeet}
        className="mt-4 min-h-12 w-full rounded-full bg-indigo-ai px-5 font-display text-sm font-bold text-white shadow-md shadow-indigo-ai/25 transition-colors hover:bg-indigo-deep"
      >
        Meet someone →
      </button>
      <p className="mt-2 text-center text-[11px] text-muted">
        Nothing is added to your conversation list.
      </p>
    </div>
  );
}
