"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Person = { id: string; name: string | null; email: string };
type Entry = { friendshipId: string; user: Person };
type Invite = {
  memberId: string;
  groupName: string;
  invitedBy: string;
  persona: { name: string; avatar: string } | null;
  memberCount: number;
};

// Compact friends pane for the desktop rail. Accepting and adding live on the
// full page; this is the "who's here" summary plus a way through.
export default function RailFriendsSection() {
  const [friends, setFriends] = useState<Entry[] | null>(null);
  const [incoming, setIncoming] = useState<Entry[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);

  useEffect(() => {
    fetch("/api/friends")
      .then((r) => r.json())
      .then((d) => {
        setFriends(d.friends ?? []);
        setIncoming(d.incoming ?? []);
      })
      .catch(() => setFriends([]));
    fetch("/api/invites")
      .then((r) => r.json())
      .then((d) => setInvites(d.invites ?? []))
      .catch(() => {});
  }, []);

  const waiting = incoming.length + invites.length;

  return (
    <div className="flex flex-col gap-3">
      {waiting > 0 && (
        <Link
          href="/friends"
          className="flex items-center gap-2 rounded-2xl border-2 border-sakura/30 bg-sakura/5 px-3 py-2.5 text-sm font-bold transition-colors hover:border-sakura"
        >
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-sakura px-1.5 text-[11px] font-bold text-white">
            {waiting}
          </span>
          {waiting === 1 ? "1 request waiting" : `${waiting} requests waiting`}
          <span className="ml-auto text-indigo-ai">→</span>
        </Link>
      )}

      <p className="px-1 text-[10px] font-extrabold uppercase tracking-wider text-muted/70">
        Friends
      </p>

      {friends === null ? (
        <p className="px-1 py-2 text-xs text-muted">Loading…</p>
      ) : friends.length === 0 ? (
        <p className="px-1 py-2 text-xs text-muted">
          No friends yet. Add someone by email and their chat appears in Chats.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {friends.map((f) => (
            <li
              key={f.friendshipId}
              className="flex items-center gap-2.5 rounded-2xl px-2 py-2"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-ai/15 text-xs font-bold uppercase text-indigo-ai">
                {(f.user.name || f.user.email).charAt(0)}
              </span>
              <span className="min-w-0 truncate text-sm font-bold">
                {f.user.name || f.user.email}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/friends"
        className="self-start rounded-full border-2 border-border px-3 py-1.5 text-xs font-bold text-muted transition-colors hover:border-indigo-ai hover:text-indigo-ai"
      >
        Manage friends
      </Link>
    </div>
  );
}
