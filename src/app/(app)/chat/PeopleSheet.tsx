"use client";

import { useEffect, useRef, useState } from "react";
import PersonaManager from "./PersonaManager";
import { useInboxContext, usePeopleContext } from "./InboxProvider";
import { personLabel } from "./usePeople";

export type PeopleFocus = "requests" | "personas";

function Initial({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-indigo-ai/15 font-bold uppercase text-indigo-ai"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {name.charAt(0)}
    </span>
  );
}

/**
 * People is management only: requests waiting on you, your friends (add, remove,
 * search), and your AI personas (create, edit, delete). Starting a conversation
 * happens in the New chat sheet — nothing here opens a chat.
 */
export default function PeopleSheet({
  focus,
  onClose,
}: {
  focus?: PeopleFocus;
  onClose: () => void;
}) {
  const { personas, reloadPersonas } = useInboxContext();
  const {
    friends,
    friendsLoading,
    incoming,
    outgoing,
    invites,
    pending,
    busy,
    addFriend,
    accept,
    remove,
    acceptInvite,
    declineInvite,
  } = usePeopleContext();

  const [query, setQuery] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const requestsRef = useRef<HTMLDivElement>(null);
  const personasRef = useRef<HTMLDivElement>(null);

  // Escape closes; the inbox behind the sheet must not scroll.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  useEffect(() => {
    if (focus === "requests") requestsRef.current?.scrollIntoView({ block: "start" });
    else if (focus === "personas")
      personasRef.current?.scrollIntoView({ block: "start" });
  }, [focus]);

  async function submitEmail() {
    const result = await addFriend(email);
    setMsg({ ok: result.ok, text: result.message });
    if (result.ok) setEmail("");
  }

  const list = friends ?? [];
  const q = query.trim().toLowerCase();
  const filteredFriends = q
    ? list.filter((entry) => personLabel(entry.user).toLowerCase().includes(q))
    : list;
  const filteredPersonas = q
    ? personas.filter((persona) => persona.name.toLowerCase().includes(q))
    : personas;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="people-title"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl border-2 border-border bg-card sm:rounded-3xl"
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <h2 id="people-title" className="font-display text-lg font-bold">
            People
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted/70 transition-colors hover:bg-indigo-ai/10 hover:text-indigo-ai"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 px-5">
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search friends and personas…"
            className="w-full rounded-full border-2 border-border bg-card px-4 py-2 text-sm outline-none placeholder:text-muted/60 focus:border-indigo-ai"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            {pending > 0 && (
              <div ref={requestsRef} className="flex flex-col gap-1.5">
                <p className="px-1 text-[10px] font-extrabold uppercase tracking-wider text-muted/70">
                  Requests
                </p>
                {incoming.map((entry) => (
                  <div
                    key={entry.friendshipId}
                    className="flex items-center gap-2 rounded-2xl border-2 border-sakura/30 bg-sakura/5 px-3 py-2"
                  >
                    <Initial name={personLabel(entry.user)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">
                        {personLabel(entry.user)}
                      </span>
                      <span className="block text-[11px] text-muted">
                        wants to be friends
                      </span>
                    </span>
                    <button
                      onClick={() => void accept(entry.friendshipId)}
                      className="shrink-0 rounded-full bg-mint px-2.5 py-1 text-[11px] font-bold text-white"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => void remove(entry.friendshipId)}
                      className="shrink-0 rounded-full border-2 border-border px-2.5 py-1 text-[11px] font-bold text-muted"
                    >
                      Decline
                    </button>
                  </div>
                ))}
                {invites.map((invite) => (
                  <div
                    key={invite.memberId}
                    className="flex items-center gap-2 rounded-2xl border-2 border-sakura/30 bg-sakura/5 px-3 py-2"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-ai/10 text-base">
                      {invite.persona?.avatar ?? (invite.kind === "dm" ? "✉️" : "👥")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">
                        {invite.groupName}
                      </span>
                      <span className="block truncate text-[11px] text-muted">
                        {invite.kind === "dm"
                          ? `${invite.invitedBy} wants to message you`
                          : `Invite from ${invite.invitedBy} · ${invite.memberCount} members`}
                      </span>
                    </span>
                    <button
                      onClick={() => void acceptInvite(invite.memberId)}
                      className="shrink-0 rounded-full bg-mint px-2.5 py-1 text-[11px] font-bold text-white"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => void declineInvite(invite.memberId)}
                      className="shrink-0 rounded-full border-2 border-border px-2.5 py-1 text-[11px] font-bold text-muted"
                    >
                      Decline
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-1">
              <p className="px-1 text-[10px] font-extrabold uppercase tracking-wider text-muted/70">
                Friends
              </p>
              {friendsLoading ? (
                <p className="px-1 py-1 text-xs text-muted">Loading…</p>
              ) : list.length === 0 ? (
                <p className="px-1 py-1 text-xs text-muted">
                  No friends yet. Add someone by email below.
                </p>
              ) : (
                filteredFriends.map((entry) => (
                  <div key={entry.friendshipId} className="flex items-center gap-2">
                    <span className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl px-2 py-2">
                      <Initial name={personLabel(entry.user)} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">
                          {personLabel(entry.user)}
                        </span>
                        <span className="block truncate text-[11px] text-muted">
                          {entry.user.email}
                        </span>
                      </span>
                    </span>
                    <button
                      onClick={() => void remove(entry.friendshipId)}
                      aria-label={`Remove ${personLabel(entry.user)}`}
                      className="shrink-0 rounded-full px-1 text-[11px] font-bold text-muted/50 transition-colors hover:text-sakura"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
              {!friendsLoading && list.length > 0 && filteredFriends.length === 0 && q && (
                <p className="px-1 py-1 text-xs text-muted">
                  No friends match &ldquo;{query}&rdquo;.
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submitEmail();
                }}
                placeholder="Add by email"
                className="min-w-0 flex-1 rounded-full border-2 border-border bg-card px-3 py-1.5 text-xs outline-none placeholder:text-muted/60 focus:border-indigo-ai"
              />
              <button
                onClick={() => void submitEmail()}
                disabled={busy || !email.trim()}
                className="shrink-0 rounded-full bg-indigo-ai px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-indigo-deep disabled:opacity-40"
              >
                {busy ? "…" : "Send"}
              </button>
            </div>
            {msg && (
              <p
                className={`px-1 text-[11px] font-semibold ${
                  msg.ok ? "text-mint" : "text-sakura"
                }`}
              >
                {msg.text}
              </p>
            )}
            {outgoing.length > 0 && (
              <p className="px-1 text-[11px] text-muted">
                Sent: {outgoing.map((e) => personLabel(e.user)).join(", ")}
              </p>
            )}

            <div ref={personasRef} className="flex flex-col gap-2">
              <p className="px-1 text-[10px] font-extrabold uppercase tracking-wider text-muted/70">
                AI personas
              </p>
              <PersonaManager
                compact
                showChat={false}
                personas={filteredPersonas}
                onChange={reloadPersonas}
                onStartChat={() => {}}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
