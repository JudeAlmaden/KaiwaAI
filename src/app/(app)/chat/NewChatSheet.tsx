"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Chip } from "../ui";
import QuestLauncher from "./QuestLauncher";
import { useInboxContext, usePeopleContext } from "./InboxProvider";
import { personLabel } from "./usePeople";

export type ComposeMode = "people" | "group";

const MODES: { id: ComposeMode; label: string }[] = [
  { id: "people", label: "Message" },
  { id: "group", label: "New group" },
];

/** Server cap is 5 humans including you. */
const MAX_GROUP_FRIENDS = 4;

/**
 * Writing only: pick a friend or persona to message, send a message request to
 * someone who is not a friend yet, or create a group. Contacts management lives
 * in the People sheet.
 */
export default function NewChatSheet({
  initialMode = "people",
  focusSearch = false,
  initialQuestsOpen = false,
  onClose,
}: {
  initialMode?: ComposeMode;
  focusSearch?: boolean;
  initialQuestsOpen?: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { personas } = useInboxContext();
  const { friends } = usePeopleContext();

  const [mode, setMode] = useState<ComposeMode>(initialMode);
  const [query, setQuery] = useState("");
  const [pickedFriends, setPickedFriends] = useState<Set<string>>(new Set());
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [requestEmail, setRequestEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuests, setShowQuests] = useState(initialQuestsOpen);

  const searchRef = useRef<HTMLInputElement>(null);

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
    if (focusSearch) searchRef.current?.focus();
  }, [focusSearch]);

  function toggleFriend(id: string) {
    setPickedFriends((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_GROUP_FRIENDS) next.add(id);
      return next;
    });
  }

  async function create(payload: {
    personaId?: string | null;
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
  const q = query.trim().toLowerCase();
  const visibleFriends = q
    ? list.filter((entry) => personLabel(entry.user).toLowerCase().includes(q))
    : list;
  const visiblePersonas = q
    ? personas.filter((persona) => persona.name.toLowerCase().includes(q))
    : personas;
  const nothingMatches =
    q.length > 0 && visibleFriends.length === 0 && visiblePersonas.length === 0;

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
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mode === "group" ? "Search people to invite…" : "Search people…"}
            className="w-full rounded-full border-2 border-border bg-card px-4 py-2 text-sm outline-none placeholder:text-muted/60 focus:border-indigo-ai"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {mode === "people" && (
            <div className="flex flex-col gap-1">
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
              {list.length === 0 && (
                <p className="px-1 py-1 text-xs text-muted">
                  No friends yet. Add someone from People, or send a message
                  request below.
                </p>
              )}

              {visiblePersonas.length > 0 && (
                <p className="mt-2 px-1 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-muted/70">
                  AI personas
                </p>
              )}
              {visiblePersonas.map((persona) => (
                <button
                  key={persona.id}
                  onClick={() => void create({ personaId: persona.id })}
                  disabled={busy}
                  className="flex items-center gap-2.5 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-indigo-ai/10 disabled:opacity-60"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-ai/10 text-base">
                    {persona.avatar}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">
                    {persona.name}
                  </span>
                  <span className="shrink-0 text-indigo-ai">→</span>
                </button>
              ))}

              {nothingMatches && (
                <p className="px-1 py-2 text-xs text-muted">
                  No one matches &ldquo;{query}&rdquo;.
                </p>
              )}

              {!q && (
                <button
                  onClick={() => setShowQuests((open) => !open)}
                  className="mt-2 self-start rounded-full border-2 border-border px-3 py-1.5 text-xs font-bold text-muted transition-colors hover:border-indigo-ai hover:text-indigo-ai"
                  aria-expanded={showQuests}
                >
                  Roleplay quest
                </button>
              )}
              {showQuests && (
                <div className="mt-2">
                  <QuestLauncher
                    onStartQuest={(groupId) => {
                      onClose();
                      router.push(`/chat/c/${groupId}`);
                    }}
                  />
                </div>
              )}

              <div className="mt-4 rounded-2xl border-2 border-border/80 bg-bg/40 p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted/70">
                  Message request
                </p>
                <p className="mt-0.5 text-[11px] text-muted">
                  Not friends yet? Write to an email — they accept before the chat
                  opens for them.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={requestEmail}
                    onChange={(e) => setRequestEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && requestEmail.trim() && !busy) {
                        void create({ email: requestEmail.trim() });
                      }
                    }}
                    placeholder="friend@email.com"
                    className="min-w-0 flex-1 rounded-full border-2 border-border bg-card px-3 py-1.5 text-xs outline-none placeholder:text-muted/60 focus:border-indigo-ai"
                  />
                  <button
                    onClick={() => void create({ email: requestEmail.trim() })}
                    disabled={busy || !requestEmail.trim()}
                    className="shrink-0 rounded-full bg-indigo-ai px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                  >
                    {busy ? "…" : "Send"}
                  </button>
                </div>
              </div>

            </div>
          )}

          {mode === "group" && (
            <div className="flex flex-col gap-3">
              <div>
                <p className="mb-1.5 px-1 text-[10px] font-extrabold uppercase tracking-wider text-muted/70">
                  Friends to invite (up to 4)
                </p>
                {list.length === 0 ? (
                  <p className="px-1 text-xs text-muted">
                    Add friends first from People to invite them.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {visibleFriends.map((entry) => (
                      <Chip
                        key={entry.friendshipId}
                        active={pickedFriends.has(entry.user.id)}
                        disabled={
                          !pickedFriends.has(entry.user.id) &&
                          pickedFriends.size >= MAX_GROUP_FRIENDS
                        }
                        onClick={() => toggleFriend(entry.user.id)}
                      >
                        {personLabel(entry.user)}
                      </Chip>
                    ))}
                  </div>
                )}
                {pickedFriends.size >= MAX_GROUP_FRIENDS && (
                  <p className="mt-1.5 px-1 text-[11px] text-muted">
                    {MAX_GROUP_FRIENDS} friends is the most a group can hold.
                  </p>
                )}
              </div>

              <div>
                <p className="mb-1.5 px-1 text-[10px] font-extrabold uppercase tracking-wider text-muted/70">
                  AI persona (one, optional)
                </p>
                <div className="flex flex-wrap gap-2">
                  {visiblePersonas.map((persona) => (
                    <Chip
                      key={persona.id}
                      active={personaId === persona.id}
                      onClick={() =>
                        setPersonaId((cur) =>
                          cur === persona.id ? null : persona.id
                        )
                      }
                    >
                      {persona.avatar} {persona.name}
                    </Chip>
                  ))}
                </div>
              </div>

              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group name (optional)"
                className="w-full rounded-full border-2 border-border bg-card px-4 py-2 text-sm outline-none focus:border-indigo-ai"
              />

              <button
                onClick={() =>
                  void create({
                    name: groupName.trim(),
                    friendIds: [...pickedFriends],
                    personaId,
                  })
                }
                disabled={busy || (pickedFriends.size === 0 && !personaId)}
                className="w-full rounded-full bg-indigo-ai py-2.5 text-sm font-bold text-white disabled:opacity-40"
              >
                {busy ? "Creating…" : "Create group"}
              </button>
              <p className="text-center text-[11px] text-muted">
                Invited friends get a request they can accept.
              </p>
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
