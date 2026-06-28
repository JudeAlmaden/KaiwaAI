"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Surface } from "../ui";

type Person = { id: string; name: string | null; email: string };
type Entry = { friendshipId: string; user: Person };
type Invite = {
  memberId: string;
  groupName: string;
  invitedBy: string;
  persona: { name: string; avatar: string } | null;
  memberCount: number;
};

export default function FriendsPanel() {
  const [friends, setFriends] = useState<Entry[]>([]);
  const [incoming, setIncoming] = useState<Entry[]>([]);
  const [outgoing, setOutgoing] = useState<Entry[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  const load = useCallback(() => {
    fetch("/api/friends")
      .then((r) => r.json())
      .then((d) => {
        setFriends(d.friends ?? []);
        setIncoming(d.incoming ?? []);
        setOutgoing(d.outgoing ?? []);
      })
      .catch(() => {});
    fetch("/api/invites")
      .then((r) => r.json())
      .then((d) => setInvites(d.invites ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => load(), [load]);

  async function addFriend() {
    const e = email.trim();
    if (!e || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setMsg({ kind: "err", text: d.error ?? "Couldn't send request." });
      else {
        setEmail("");
        setMsg({ kind: "ok", text: d.accepted ? "Friend added!" : "Request sent." });
        load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function accept(id: string) {
    await fetch(`/api/friends/${id}`, { method: "PATCH" });
    load();
  }
  async function remove(id: string) {
    await fetch(`/api/friends/${id}`, { method: "DELETE" });
    load();
  }
  async function acceptInvite(memberId: string) {
    await fetch(`/api/invites/${memberId}`, { method: "PATCH" });
    load();
  }
  async function declineInvite(memberId: string) {
    await fetch(`/api/invites/${memberId}`, { method: "DELETE" });
    load();
  }

  const label = (p: Person) => p.name || p.email;

  const filteredFriends = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((e) => label(e.user).toLowerCase().includes(q));
  }, [friends, query]);

  const requestCount = incoming.length + invites.length;

  return (
    <div className="flex flex-col gap-4">
      {/* Add a friend */}
      <Surface>
        <h2 className="font-display text-base font-bold">Add a friend</h2>
        <p className="mt-0.5 text-sm text-muted">
          Send a request by email. They&apos;ll appear once they accept.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addFriend()}
            placeholder="friend@email.com"
            className="flex-1 rounded-full border-2 border-border bg-card px-4 py-2 text-sm outline-none focus:border-indigo-ai"
          />
          <button
            onClick={addFriend}
            disabled={busy || !email.trim()}
            className="rounded-full bg-indigo-ai px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            {busy ? "…" : "Send"}
          </button>
        </div>
        {msg && (
          <p
            className={`mt-2 text-xs font-semibold ${
              msg.kind === "ok" ? "text-mint" : "text-sakura"
            }`}
          >
            {msg.text}
          </p>
        )}
      </Surface>

      {/* Requests + invites */}
      {requestCount > 0 && (
        <Surface>
          <h2 className="flex items-center gap-2 font-display text-base font-bold">
            Requests
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-sakura px-1 text-[10px] font-bold text-white">
              {requestCount}
            </span>
          </h2>

          <div className="mt-3 flex flex-col divide-y divide-border">
            {incoming.map((e) => (
              <div key={e.friendshipId} className="flex items-center gap-3 py-2.5">
                <Initial name={label(e.user)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{label(e.user)}</p>
                  <p className="truncate text-xs text-muted">wants to be friends</p>
                </div>
                <button
                  onClick={() => accept(e.friendshipId)}
                  className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-white"
                >
                  Accept
                </button>
                <button
                  onClick={() => remove(e.friendshipId)}
                  className="rounded-full border-2 border-border px-3 py-1 text-xs font-bold text-muted"
                >
                  Decline
                </button>
              </div>
            ))}

            {invites.map((inv) => (
              <div key={inv.memberId} className="flex items-center gap-3 py-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-ai/10 text-lg">
                  {inv.persona?.avatar ?? "👥"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{inv.groupName}</p>
                  <p className="truncate text-xs text-muted">
                    Group invite from {inv.invitedBy} · {inv.memberCount} members
                  </p>
                </div>
                <button
                  onClick={() => acceptInvite(inv.memberId)}
                  className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-white"
                >
                  Join
                </button>
                <button
                  onClick={() => declineInvite(inv.memberId)}
                  className="rounded-full border-2 border-border px-3 py-1 text-xs font-bold text-muted"
                >
                  Decline
                </button>
              </div>
            ))}
          </div>
        </Surface>
      )}

      {/* Friends list */}
      <Surface>
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-base font-bold">
            Your friends{friends.length > 0 && ` (${friends.length})`}
          </h2>
        </div>

        {friends.length >= 6 && (
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search friends…"
            className="mt-3 w-full rounded-full border-2 border-border bg-card px-4 py-2 text-sm outline-none focus:border-indigo-ai"
          />
        )}

        {friends.length === 0 ? (
          <div className="mt-3 rounded-2xl border-2 border-dashed border-border px-4 py-8 text-center">
            <p className="text-sm text-muted">No friends yet.</p>
            <p className="mt-1 text-xs text-muted">
              Add someone by email above to start chatting.
            </p>
          </div>
        ) : (
          <div className="mt-3 flex max-h-96 flex-col divide-y divide-border overflow-y-auto">
            {filteredFriends.map((e) => (
              <div key={e.friendshipId} className="group flex items-center gap-3 py-2.5">
                <Initial name={label(e.user)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{label(e.user)}</p>
                  <p className="truncate text-xs text-muted">{e.user.email}</p>
                </div>
                <button
                  onClick={() => remove(e.friendshipId)}
                  className="text-xs font-bold text-muted/50 opacity-0 transition-opacity hover:text-sakura group-hover:opacity-100"
                >
                  Remove
                </button>
              </div>
            ))}
            {filteredFriends.length === 0 && (
              <p className="py-4 text-center text-sm text-muted">
                No friends match &ldquo;{query}&rdquo;.
              </p>
            )}
          </div>
        )}

        {outgoing.length > 0 && (
          <p className="mt-3 border-t-2 border-border pt-3 text-xs text-muted">
            Pending sent: {outgoing.map((e) => label(e.user)).join(", ")}
          </p>
        )}
      </Surface>
    </div>
  );
}

function Initial({ name }: { name: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-ai/15 text-sm font-bold uppercase text-indigo-ai">
      {name.charAt(0)}
    </span>
  );
}
