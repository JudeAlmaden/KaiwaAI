"use client";

import { useCallback, useEffect, useState } from "react";

export type Person = { id: string; name: string | null; email: string };
export type FriendEntry = { friendshipId: string; user: Person };
export type Invite = {
  memberId: string;
  /** "dm" means a message request; anything else is a group invite. */
  kind?: string;
  groupName: string;
  invitedBy: string;
  persona: { name: string; avatar: string } | null;
  memberCount: number;
};

export type AddFriendResult = { ok: boolean; message: string };

/** Requests and group invites both block a name from being "just a friend". */
export function pendingCount(incoming: FriendEntry[], invites: Invite[]): number {
  return incoming.length + invites.length;
}

export function personLabel(person: { name: string | null; email: string }): string {
  return person.name?.trim() || person.email;
}

/**
 * Friends, requests and group invites with their actions, shared by the People
 * group and the compose sheet so accepting never round-trips to a /friends page.
 */
export function usePeople() {
  const [friends, setFriends] = useState<FriendEntry[] | null>(null);
  const [incoming, setIncoming] = useState<FriendEntry[]>([]);
  const [outgoing, setOutgoing] = useState<FriendEntry[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    return Promise.all([
      fetch("/api/friends")
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({})),
      fetch("/api/invites")
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({})),
    ]).then(([friendData, inviteData]) => {
      const d = friendData as {
        friends?: FriendEntry[];
        incoming?: FriendEntry[];
        outgoing?: FriendEntry[];
      };
      setFriends(d.friends ?? []);
      setIncoming(d.incoming ?? []);
      setOutgoing(d.outgoing ?? []);
      setInvites((inviteData as { invites?: Invite[] }).invites ?? []);
    });
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addFriend = useCallback(
    async (email: string): Promise<AddFriendResult> => {
      const trimmed = email.trim();
      if (!trimmed) return { ok: false, message: "Enter an email first." };
      setBusy(true);
      try {
        const res = await fetch("/api/friends", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmed }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          accepted?: boolean;
        };
        if (!res.ok) {
          return { ok: false, message: data.error ?? "Couldn't send the request." };
        }
        await reload();
        return {
          ok: true,
          message: data.accepted ? "Friend added!" : "Request sent.",
        };
      } catch {
        return { ok: false, message: "Couldn't send the request." };
      } finally {
        setBusy(false);
      }
    },
    [reload]
  );

  const accept = useCallback(
    async (friendshipId: string) => {
      await fetch(`/api/friends/${friendshipId}`, { method: "PATCH" }).catch(
        () => null
      );
      await reload();
    },
    [reload]
  );

  const remove = useCallback(
    async (friendshipId: string) => {
      await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" }).catch(
        () => null
      );
      await reload();
    },
    [reload]
  );

  const acceptInvite = useCallback(
    async (memberId: string) => {
      await fetch(`/api/invites/${memberId}`, { method: "PATCH" }).catch(
        () => null
      );
      await reload();
    },
    [reload]
  );

  const declineInvite = useCallback(
    async (memberId: string) => {
      await fetch(`/api/invites/${memberId}`, { method: "DELETE" }).catch(
        () => null
      );
      await reload();
    },
    [reload]
  );

  return {
    friends,
    friendsLoading: friends === null,
    incoming,
    outgoing,
    invites,
    pending: pendingCount(incoming, invites),
    busy,
    reload,
    addFriend,
    accept,
    remove,
    acceptInvite,
    declineInvite,
  };
}
