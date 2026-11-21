"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePeopleContext } from "./InboxProvider";
import { personLabel } from "./usePeople";
import { useDebounce } from "@/hooks/useDebounce";
import { looksLikeEmail } from "@/lib/email-utils";

export type ComposeMode = "people" | "group";

const MODES: { id: ComposeMode; label: string }[] = [
  { id: "people", label: "Message" },
  { id: "group", label: "New group" },
];

/** Server cap is 5 humans including you. */
const MAX_GROUP_FRIENDS = 4;

/**
 * Writing only: pick a friend to message, send a message request to someone
 * who is not a friend yet, or create a group.
 */
export default function NewChatSheet({
  initialMode = "people",
  focusSearch = false,
  onClose,
}: {
  initialMode?: ComposeMode;
  focusSearch?: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { friends } = usePeopleContext();

  const [mode, setMode] = useState<ComposeMode>(initialMode);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 180);
  const [pickedFriends, setPickedFriends] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
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
    if (focusSearch) searchRef.current?.focus();
  }, [focusSearch]);

  function handleScroll() {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      if (document.activeElement === searchRef.current) {
        searchRef.current?.blur();
      }
    }, 80);
  }

  function toggleFriend(id: string) {
    setPickedFriends((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_GROUP_FRIENDS) next.add(id);
      return next;
    });
  }

  async function create(payload: {
    friendIds?: string[];
    name?: string;
    email?: string;
  }) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        group?: { id: string };
        error?: string;
        request?: boolean;
      };
      if (!res.ok || !data.group?.id) {
        setError(data.error ?? "Couldn't start the chat.");
        return;
      }
      onClose();
      router.push(`/chat/c/${data.group.id}`);
    } finally {
      setBusy(false);
    }
  }

  const list = friends ?? [];
  const q = debouncedQuery.trim().toLowerCase();
  const visibleFriends = q
    ? list.filter((entry) => personLabel(entry.user).toLowerCase().includes(q) || entry.user.email.toLowerCase().includes(q))
    : list;
  const nothingMatches = q.length > 0 && visibleFriends.length === 0;

  const trimmedQuery = query.trim();
  const isInputEmail = mode === "people" && looksLikeEmail(trimmedQuery);
  const isDebouncedEmail = mode === "people" && looksLikeEmail(debouncedQuery);
  const alreadyFriend = list.some(
    (entry) => entry.user.email.toLowerCase() === q
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
        aria-labelledby="new-chat-title"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-md flex-col rounded-t-3xl border-2 border-border bg-card sm:rounded-3xl"
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <h2 id="new-chat-title" className="font-display text-lg font-bold">
            New chat
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted/70 transition-colors hover:bg-indigo-ai/10 hover:text-indigo-ai"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 flex items-center gap-1 px-5">
          {MODES.map((item) => (
            <button
              key={item.id}
              onClick={() => setMode(item.id)}
              aria-pressed={mode === item.id}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                mode === item.id
                  ? "bg-indigo-ai text-white shadow-sm"
                  : "text-muted hover:bg-indigo-ai/10 hover:text-indigo-ai"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-3 px-5">
          <div className="relative flex items-center">
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isInputEmail && !busy) {
                  e.preventDefault();
                  void create({ email: trimmedQuery });
                }
              }}
              placeholder={
                mode === "group"
                  ? "Search people to invite…"
                  : "Search friends or type an email…"
              }
              className="w-full rounded-full border-2 border-border bg-card px-4 py-2 pr-20 text-sm outline-none placeholder:text-muted/60 transition-colors focus:border-indigo-ai"
            />
            {isInputEmail && (
              <button
                type="button"
                onClick={() => void create({ email: trimmedQuery })}
                disabled={busy}
                className="absolute right-1.5 rounded-full bg-indigo-ai px-3.5 py-1 text-xs font-bold text-white transition-colors hover:bg-indigo-deep disabled:opacity-40"
              >
                {busy ? "…" : "Send"}
              </button>
            )}
          </div>
        </div>

        <div
          onScroll={handleScroll}
          className="min-h-0 flex-1 overflow-y-auto px-5 py-3 scroll-smooth"
        >
          {mode === "people" && (
            <div className="flex flex-col gap-1">
              {isDebouncedEmail && !alreadyFriend && (
                <div className="mb-2 flex items-center justify-between rounded-2xl border-2 border-indigo-ai/30 bg-indigo-ai/5 p-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-ai/15 text-sm">
                      ✉️
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">
                        Message &ldquo;{debouncedQuery.trim()}&rdquo;
                      </span>
                      <span className="block truncate text-[11px] text-muted">
                        Send a message request to this email
                      </span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void create({ email: debouncedQuery.trim() })}
                    disabled={busy}
                    className="shrink-0 rounded-full bg-indigo-ai px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-indigo-deep disabled:opacity-40"
                  >
                    {busy ? "…" : "Send"}
                  </button>
                </div>
              )}

              {visibleFriends.length > 0 && (
                <p className="px-1 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-muted/70">
                  Friends
                </p>
              )}
              {visibleFriends.map((entry) => (
                <button
                  key={entry.friendshipId}
                  onClick={() => void create({ friendIds: [entry.user.id] })}
                  disabled={busy}
                  className="flex items-center gap-2.5 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-indigo-ai/10 disabled:opacity-60"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-ai/15 text-xs font-bold uppercase text-indigo-ai">
                    {personLabel(entry.user).charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">
                      {personLabel(entry.user)}
                    </span>
                    <span className="block truncate text-[11px] text-muted">
                      {entry.user.email}
                    </span>
                  </span>
                  <span className="shrink-0 text-indigo-ai">→</span>
                </button>
              ))}
              {list.length === 0 && !isDebouncedEmail && (
                <p className="px-1 py-1 text-xs text-muted">
                  No friends yet. Add someone from People, or write to an email above.
                </p>
              )}

              {nothingMatches && !isDebouncedEmail && (
                <p className="px-1 py-2 text-xs text-muted">
                  No one matches &ldquo;{debouncedQuery}&rdquo;. Type a full email to message them.
                </p>
              )}
            </div>
          )}

          {mode === "group" && (
            <div className="flex flex-col gap-3">
              {/* Group Name input */}
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-base text-muted">👥</span>
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group name (optional)"
                  className="w-full rounded-full border-2 border-border bg-card pl-9 pr-4 py-2 text-sm outline-none placeholder:text-muted/60 transition-colors focus:border-indigo-ai"
                />
              </div>

              {/* Selected friends tray */}
              {pickedFriends.size > 0 && (
                <div className="flex flex-col gap-1.5 rounded-2xl border-2 border-indigo-ai/20 bg-indigo-ai/5 p-2.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-ai">
                      Selected ({pickedFriends.size}/{MAX_GROUP_FRIENDS})
                    </span>
                    {pickedFriends.size >= MAX_GROUP_FRIENDS && (
                      <span className="text-[10px] text-muted font-semibold">Max reached</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[...pickedFriends].map((id) => {
                      const friend = list.find((f) => f.user.id === id);
                      if (!friend) return null;
                      const name = personLabel(friend.user);
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 rounded-full bg-card border-2 border-indigo-ai/40 pl-2 pr-1.5 py-0.5 text-xs font-bold text-foreground shadow-xs"
                        >
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-ai/15 text-[9px] font-extrabold text-indigo-ai">
                            {name.charAt(0).toUpperCase()}
                          </span>
                          <span className="max-w-[120px] truncate">{name}</span>
                          <button
                            type="button"
                            onClick={() => toggleFriend(id)}
                            className="flex h-4 w-4 items-center justify-center rounded-full text-muted hover:bg-sakura/10 hover:text-sakura"
                            title={`Remove ${name}`}
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Friends list with checkmarks */}
              <div>
                <p className="mb-1.5 px-1 text-[10px] font-extrabold uppercase tracking-wider text-muted/70">
                  {pickedFriends.size === 0 ? "Pick friends to invite (up to 4)" : "Friends"}
                </p>
                {list.length === 0 ? (
                  <p className="px-1 py-1 text-xs text-muted">
                    Add friends first from People to invite them.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {visibleFriends.map((entry) => {
                      const isPicked = pickedFriends.has(entry.user.id);
                      const isMax = !isPicked && pickedFriends.size >= MAX_GROUP_FRIENDS;
                      const name = personLabel(entry.user);
                      return (
                        <button
                          key={entry.friendshipId}
                          type="button"
                          disabled={busy || isMax}
                          onClick={() => toggleFriend(entry.user.id)}
                          className={`flex items-center gap-2.5 rounded-2xl px-2.5 py-2 text-left transition-all ${
                            isPicked
                              ? "bg-indigo-ai/10 border-2 border-indigo-ai/40"
                              : "border-2 border-transparent hover:bg-indigo-ai/5 disabled:opacity-40"
                          }`}
                        >
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold uppercase text-xs transition-colors ${
                            isPicked ? "bg-indigo-ai text-white" : "bg-indigo-ai/15 text-indigo-ai"
                          }`}>
                            {name.charAt(0)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold">{name}</span>
                            <span className="block truncate text-[11px] text-muted">{entry.user.email}</span>
                          </span>
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs font-extrabold transition-colors ${
                            isPicked ? "border-indigo-ai bg-indigo-ai text-white" : "border-border text-transparent"
                          }`}>
                            ✓
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {nothingMatches && (
                  <p className="px-1 py-2 text-xs text-muted">
                    No one matches &ldquo;{debouncedQuery}&rdquo;.
                  </p>
                )}
              </div>

              {/* Create group button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() =>
                    void create({
                      name: groupName.trim(),
                      friendIds: [...pickedFriends],
                    })
                  }
                  disabled={busy || pickedFriends.size === 0}
                  className="w-full rounded-full bg-indigo-ai py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-deep disabled:opacity-40"
                >
                  {busy
                    ? "Creating…"
                    : pickedFriends.size > 0
                      ? `Create group (${pickedFriends.size})`
                      : "Create group"}
                </button>
                <p className="mt-1.5 text-center text-[11px] text-muted">
                  Invited friends get a request they can accept.
                </p>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-3 text-center text-xs font-semibold text-sakura">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
