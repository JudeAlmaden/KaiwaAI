"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "../../chat/Avatar";
import type { GroupInfo } from "./group-types";

type Friend = { friendshipId: string; user: { id: string; name: string | null; email: string } };

/**
 * Owner-facing group management, opened from the conversation's ⋯ menu:
 * rename the group, invite/remove members, and manage Kai (attitude, memory,
 * join/leave). Non-owners see the member list and a Leave action.
 */
export default function GroupSettings({
  group,
  onClose,
  onReload,
  onLeft,
}: {
  group: GroupInfo;
  onClose: () => void;
  onReload: () => void;
  onLeft: () => void;
}) {
  const [name, setName] = useState(group.name);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!group.isOwner) return;
    fetch("/api/friends")
      .then((r) => r.json())
      .then((d) => setFriends(d.friends ?? []))
      .catch(() => {});
  }, [group.isOwner]);

  async function run(key: string, fn: () => Promise<Response | void>) {
    setBusy(key);
    setError(null);
    setMessage(null);
    try {
      const res = await fn();
      if (res && !res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "That didn't work.");
        return false;
      }
      return true;
    } finally {
      setBusy(null);
    }
  }

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === group.name) return;
    const ok = await run("name", () =>
      fetch(`/api/groups/${group.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      })
    );
    if (ok) {
      setMessage("Group renamed.");
      onReload();
    }
  }

  async function saveNickname(memberId: string) {
    const trimmed = draft.trim();
    const ok = await run(`nickname-${memberId}`, () =>
      fetch(`/api/groups/${group.id}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: trimmed }),
      })
    );
    if (ok) {
      setEditing(null);
      setMessage(trimmed ? "Nickname saved." : "Nickname cleared.");
      onReload();
    }
  }

  async function invite(friendId: string) {
    const ok = await run(`invite-${friendId}`, () =>
      fetch(`/api/groups/${group.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendId }),
      })
    );
    if (ok) {
      setMessage("Invite sent — they can accept it from Requests.");
      onReload();
    }
  }

  async function removeMember(memberId: string, label: string | null | undefined) {
    const ok = await run(`remove-${memberId}`, () =>
      fetch(`/api/groups/${group.id}/members/${memberId}`, { method: "DELETE" })
    );
    if (ok) {
      setMessage(`${label ?? "Member"} removed.`);
      onReload();
    }
  }

  async function leave() {
    const me = group.members.find((m) => m.isMe && m.kind === "user");
    if (!me?.id) return;
    const ok = await run("leave", () =>
      fetch(`/api/groups/${group.id}/members/${me.id}`, { method: "DELETE" })
    );
    if (ok) onLeft();
  }

  async function kaiAction(action: "add" | "remove") {
    const ok = await run(`kai-${action}`, () =>
      fetch(`/api/groups/${group.id}/kai`, {
        method: action === "add" ? "POST" : "DELETE",
      })
    );
    if (ok) {
      setMessage(action === "add" ? "Kai joined the group." : "Kai left the group.");
      onReload();
    }
  }

  async function setMode(modeId: string | null) {
    const ok = await run("mode", () =>
      fetch(`/api/groups/${group.id}/mode`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modeId }),
      })
    );
    if (ok) {
      setMessage("Kai's attitude updated for everyone.");
      onReload();
    }
  }

  const memberUserIds = new Set(
    group.members.map((m) => m.userId).filter(Boolean) as string[]
  );
  const invitable = friends.filter((f) => !memberUserIds.has(f.user.id));
  const hasKai = Boolean(group.persona);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-settings-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-md flex-col rounded-t-3xl border-2 border-border bg-card sm:rounded-3xl"
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <h2 id="group-settings-title" className="font-display text-lg font-bold">
            Group settings
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted/70 hover:bg-indigo-ai/10 hover:text-indigo-ai"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-3">
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block px-1 text-[10px] font-extrabold uppercase tracking-wider text-muted/70">
                Group name
              </label>
              <div className="flex items-center gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!group.isOwner}
                  maxLength={60}
                  className="min-w-0 flex-1 rounded-full border-2 border-border bg-card px-4 py-2 text-sm outline-none focus:border-indigo-ai disabled:opacity-60"
                />
                {group.isOwner && (
                  <button
                    onClick={() => void saveName()}
                    disabled={busy === "name" || !name.trim() || name.trim() === group.name}
                    className="shrink-0 rounded-full bg-indigo-ai px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
                  >
                    Save
                  </button>
                )}
              </div>
            </div>

            <div>
              <p className="mb-1.5 px-1 text-[10px] font-extrabold uppercase tracking-wider text-muted/70">
                Members ({group.members.filter((m) => m.kind === "user").length})
              </p>
              <div className="flex flex-col gap-1">
                {group.members
                  .filter((m) => m.kind === "user")
                  .map((m) => (
                    <div key={m.id ?? m.name} className="flex items-center gap-2.5 px-1 py-1">
                      <Avatar name={m.name ?? "?"} size={30} />
                      {editing === m.id ? (
                        <div className="flex min-w-0 flex-1 items-center gap-1.5">
                          <input
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            maxLength={24}
                            autoFocus
                            placeholder="Nickname"
                            aria-label="Nickname"
                            className="min-w-0 flex-1 rounded-full border-2 border-border bg-card px-2.5 py-1 text-xs outline-none focus:border-indigo-ai"
                          />
                          <button
                            onClick={() => void saveNickname(m.id!)}
                            disabled={busy === `nickname-${m.id}`}
                            className="shrink-0 rounded-full bg-indigo-ai px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            aria-label="Cancel nickname"
                            className="shrink-0 px-1 text-xs font-bold text-muted"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="min-w-0 flex-1 truncate text-sm font-bold">
                            {m.isMe ? `${m.name} (you)` : m.name}
                            {m.status === "pending" && (
                              <span className="ml-2 rounded-full bg-amber/15 px-2 py-0.5 text-[9px] font-bold uppercase text-amber">
                                Invited
                              </span>
                            )}
                          </span>
                          <div className="flex shrink-0 items-center gap-0.5">
                            {(group.isOwner || m.isMe) && m.id && m.status !== "pending" && (
                              <button
                                onClick={() => {
                                  setEditing(m.id ?? null);
                                  setDraft(m.nickname ?? "");
                                }}
                                className="rounded-full px-2 py-1 text-[11px] font-bold text-muted/60 transition-colors hover:text-indigo-ai"
                              >
                                {m.nickname ? "Edit name" : "Nickname"}
                              </button>
                            )}
                            {group.isOwner && !m.isMe && m.id && (
                              <button
                                onClick={() => void removeMember(m.id!, m.name)}
                                disabled={busy === `remove-${m.id}`}
                                className="shrink-0 rounded-full px-2 py-1 text-[11px] font-bold text-muted/60 hover:text-sakura disabled:opacity-50"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {group.isOwner && invitable.length > 0 && (
              <div>
                <p className="mb-1.5 px-1 text-[10px] font-extrabold uppercase tracking-wider text-muted/70">
                  Invite a friend
                </p>
                <div className="flex flex-col gap-1">
                  {invitable.map((f) => (
                    <button
                      key={f.friendshipId}
                      onClick={() => void invite(f.user.id)}
                      disabled={busy === `invite-${f.user.id}`}
                      className="flex items-center gap-2.5 rounded-2xl px-2 py-1.5 text-left transition-colors hover:bg-indigo-ai/10 disabled:opacity-60"
                    >
                      <Avatar name={f.user.name ?? f.user.email} size={28} />
                      <span className="min-w-0 flex-1 truncate text-sm font-bold">
                        {f.user.name ?? f.user.email}
                      </span>
                      <span className="shrink-0 text-xs font-bold text-indigo-ai">
                        Invite
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border-2 border-border/80 bg-bg/40 p-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted/70">
                  Kai
                </p>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/memory?chat=${encodeURIComponent(group.id)}`}
                    className="text-[11px] font-bold text-indigo-ai hover:underline"
                  >
                    Group memory
                  </Link>
                  {hasKai && group.persona && (
                    <Link
                      href={`/memory?persona=${encodeURIComponent(group.persona.id)}`}
                      className="text-[11px] font-bold text-indigo-ai hover:underline"
                    >
                      Kai&apos;s memory
                    </Link>
                  )}
                </div>
              </div>

              {!hasKai ? (
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <p className="text-xs text-muted">
                    Kai isn&apos;t in this group. Add Kai to @mention them.
                  </p>
                  {group.isOwner && (
                    <button
                      onClick={() => void kaiAction("add")}
                      disabled={busy === "kai-add"}
                      className="shrink-0 rounded-full bg-indigo-ai px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Add Kai
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => void setMode(null)}
                      disabled={!group.isOwner || busy === "mode" || !group.activeMode}
                      className={`flex w-full items-center justify-center gap-1 rounded-full border-2 px-2.5 py-1 text-[11px] font-bold disabled:opacity-50 ${
                        !group.activeMode
                          ? "border-indigo-ai text-indigo-ai"
                          : "border-border text-muted"
                      }`}
                    >
                      🦊 Default
                    </button>
                    {(group.kaiModes ?? []).map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => void setMode(mode.id)}
                        disabled={
                          !group.isOwner || busy === "mode" || group.activeMode?.id === mode.id
                        }
                        className={`flex w-full items-center justify-center gap-1 rounded-full border-2 px-2.5 py-1 text-[11px] font-bold disabled:opacity-50 ${
                          group.activeMode?.id === mode.id
                            ? "border-indigo-ai text-indigo-ai"
                            : "border-border text-muted"
                        }`}
                      >
                        {mode.avatar} {mode.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[10px] text-muted">
                    Attitude changes how Kai speaks for everyone in this group.
                  </p>
                  {group.isOwner && (
                    <button
                      onClick={() => void kaiAction("remove")}
                      disabled={busy === "kai-remove"}
                      className="mt-2 text-[11px] font-bold text-muted/70 hover:text-sakura disabled:opacity-50"
                    >
                      Remove Kai from group
                    </button>
                  )}
                </>
              )}
            </div>

            {!group.isOwner && (
              <button
                onClick={() => void leave()}
                disabled={busy === "leave"}
                className="rounded-full border-2 border-sakura/40 px-4 py-2 text-xs font-bold text-sakura disabled:opacity-50"
              >
                Leave group
              </button>
            )}

            {message && <p className="text-xs font-semibold text-mint">{message}</p>}
            {error && <p className="text-xs font-semibold text-sakura">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
