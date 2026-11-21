"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePeopleContext } from "./InboxProvider";
import { personLabel } from "./usePeople";
import { useDebounce } from "@/hooks/useDebounce";
import { looksLikeEmail } from "@/lib/email-utils";

export type PeopleFocus = "requests";

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

/** One waiting request: a friend request or a group/message invite. */
function RequestCard({
  avatar,
  title,
  subtitle,
  onAccept,
  onDecline,
}: {
  avatar: ReactNode;
  title: string;
  subtitle: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border-2 border-sakura/30 bg-sakura/5 px-3 py-2">
      {avatar}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{title}</span>
        <span className="block truncate text-[11px] text-muted">{subtitle}</span>
      </span>
      <button
        onClick={onAccept}
        className="shrink-0 rounded-full bg-mint px-2.5 py-1 text-[11px] font-bold text-white"
      >
        Accept
      </button>
      <button
        onClick={onDecline}
        className="shrink-0 rounded-full border-2 border-border px-2.5 py-1 text-[11px] font-bold text-muted"
      >
        Decline
      </button>
    </div>
  );
}

/**
 * People is management only: requests waiting on you, and your friends (add,
 * remove, search). Starting a conversation happens in the New chat sheet —
 * nothing here opens a chat.
 */
export default function PeopleSheet({
  focus,
  onClose,
}: {
  focus?: PeopleFocus;
  onClose: () => void;
}) {
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
  const debouncedQuery = useDebounce(query, 180);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const requestsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [onClose]);

  useEffect(() => {
    if (focus === "requests") requestsRef.current?.scrollIntoView({ block: "start" });
  }, [focus]);

  async function submitEmail(target?: string) {
    const toAdd = (target ?? query).trim();
    if (!toAdd) return;
    const result = await addFriend(toAdd);
    setMsg({ ok: result.ok, text: result.message });
    if (result.ok) setQuery("");
  }

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const top = e.currentTarget.scrollTop;
    setIsScrolled(top > 6);

    // Debounce keyboard dismissal when scrolling through list
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      if (document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    }, 80);
  }

  const list = friends ?? [];
  const q = debouncedQuery.trim().toLowerCase();
  const filteredFriends = q
    ? list.filter(
        (entry) =>
          personLabel(entry.user).toLowerCase().includes(q) ||
          entry.user.email.toLowerCase().includes(q)
      )
    : list;

  const trimmedQuery = query.trim();
  const isInputEmail = looksLikeEmail(trimmedQuery);
  const isDebouncedEmail = looksLikeEmail(debouncedQuery);
  const alreadyFriend = list.some(
    (entry) => entry.user.email.toLowerCase() === debouncedQuery.trim().toLowerCase()
  );
  const alreadySent = outgoing.some(
    (entry) => entry.user.email.toLowerCase() === debouncedQuery.trim().toLowerCase()
  );

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

        <div className={`mt-3 px-5 transition-all ${isScrolled ? "pb-3 border-b border-border/70" : "pb-1"}`}>
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (msg) setMsg(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isInputEmail && !busy) {
                  e.preventDefault();
                  void submitEmail(trimmedQuery);
                }
              }}
              placeholder="Search friends or add by email…"
              className="w-full rounded-full border-2 border-border bg-card px-4 py-2 pr-20 text-sm outline-none placeholder:text-muted/60 transition-colors focus:border-indigo-ai"
            />
            {isInputEmail && (
              <button
                type="button"
                onClick={() => void submitEmail(trimmedQuery)}
                disabled={busy}
                className="absolute right-1.5 rounded-full bg-indigo-ai px-3.5 py-1 text-xs font-bold text-white transition-colors hover:bg-indigo-deep disabled:opacity-40"
              >
                {busy ? "…" : "Add"}
              </button>
            )}
          </div>
          {msg && (
            <p
              className={`mt-2 px-1 text-[11px] font-semibold ${
                msg.ok ? "text-mint" : "text-sakura"
              }`}
            >
              {msg.text}
            </p>
          )}
        </div>

        <div
          onScroll={handleScroll}
          className="min-h-0 flex-1 overflow-y-auto px-5 py-4 scroll-smooth"
        >
          <div className="flex flex-col gap-4">
            {pending > 0 && (
              <div ref={requestsRef} className="flex flex-col gap-1.5">
                <p className="px-1 text-[10px] font-extrabold uppercase tracking-wider text-muted/70">
                  Requests
                </p>
                {incoming.map((entry) => (
                  <RequestCard
                    key={entry.friendshipId}
                    avatar={<Initial name={personLabel(entry.user)} />}
                    title={personLabel(entry.user)}
                    subtitle="wants to be friends"
                    onAccept={() => void accept(entry.friendshipId)}
                    onDecline={() => void remove(entry.friendshipId)}
                  />
                ))}
                {invites.map((invite) => (
                  <RequestCard
                    key={invite.memberId}
                    avatar={
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-ai/10 text-base">
                        {invite.persona?.avatar ?? (invite.kind === "dm" ? "✉️" : "👥")}
                      </span>
                    }
                    title={invite.groupName}
                    subtitle={
                      invite.kind === "dm"
                        ? `${invite.invitedBy} wants to message you`
                        : `Invite from ${invite.invitedBy} · ${invite.memberCount} members`
                    }
                    onAccept={() => void acceptInvite(invite.memberId)}
                    onDecline={() => void declineInvite(invite.memberId)}
                  />
                ))}
              </div>
            )}

            {isDebouncedEmail && !alreadyFriend && !alreadySent && (
              <div className="flex items-center justify-between rounded-2xl border-2 border-indigo-ai/30 bg-indigo-ai/5 p-3">
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-ai/15 text-sm">
                    ✉️
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">
                      Add &ldquo;{debouncedQuery.trim()}&rdquo;
                    </span>
                    <span className="block truncate text-[11px] text-muted">
                      Send a friend request to this email
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void submitEmail(debouncedQuery.trim())}
                  disabled={busy}
                  className="shrink-0 rounded-full bg-indigo-ai px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-indigo-deep disabled:opacity-40"
                >
                  {busy ? "…" : "Add friend"}
                </button>
              </div>
            )}

            {isDebouncedEmail && alreadySent && (
              <p className="px-1 py-1 text-xs text-muted">
                Friend request already sent to &ldquo;{debouncedQuery.trim()}&rdquo;.
              </p>
            )}

            <div className="flex flex-col gap-1">
              <p className="px-1 text-[10px] font-extrabold uppercase tracking-wider text-muted/70">
                Friends
              </p>
              {friendsLoading ? (
                <p className="px-1 py-1 text-xs text-muted">Loading…</p>
              ) : list.length === 0 ? (
                <p className="px-1 py-1 text-xs text-muted">
                  No friends yet. Search above or type an email to add someone.
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
              {!friendsLoading && list.length > 0 && filteredFriends.length === 0 && q && !isDebouncedEmail && (
                <p className="px-1 py-1 text-xs text-muted">
                  No friends match &ldquo;{debouncedQuery}&rdquo;.
                </p>
              )}
            </div>

            {outgoing.length > 0 && (
              <p className="px-1 text-[11px] text-muted">
                Sent: {outgoing.map((e) => personLabel(e.user)).join(", ")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
