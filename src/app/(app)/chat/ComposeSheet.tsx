"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Chip } from "../ui";
import QuestLauncher from "./QuestLauncher";

export type ComposeMode = "ai" | "friend" | "group" | "meet";

type Person = { id: string; name: string | null; email: string };
type Persona = { id: string; name: string; avatar: string; builtin: boolean };

const TILES: { id: ComposeMode; label: string; icon: string }[] = [
  { id: "ai", label: "Talk to AI", icon: "🤖" },
  { id: "friend", label: "Message a friend", icon: "👤" },
  { id: "group", label: "Start a group", icon: "👥" },
  { id: "meet", label: "Meet a stranger", icon: "🌍" },
];

/**
 * The hub's single "start something" surface.
 *
 * Replaces both the old New chat modal and the AI / Friends / Meet tabs: four
 * intents pick a body inside one sheet, so nothing is reachable only through a
 * tab. Friends and persona management live at their own routes and are linked
 * from the bodies instead of being duplicated here.
 */
export default function ComposeSheet({
  mode,
  onModeChange,
  onClose,
  onCreated,
  onMeet,
  onQuest,
  strangerEnabled,
  initialQuestsOpen = false,
}: {
  mode: ComposeMode;
  onModeChange: (mode: ComposeMode) => void;
  onClose: () => void;
  onCreated: (groupId: string) => void;
  onMeet: () => void;
  onQuest: (groupId: string) => void;
  strangerEnabled: boolean;
  /** `?compose=quest` lands here from a finished quest. */
  initialQuestsOpen?: boolean;
}) {
  const [friends, setFriends] = useState<Person[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [pickedFriends, setPickedFriends] = useState<Set<string>>(new Set());
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [friendQuery, setFriendQuery] = useState("");
  const [showQuests, setShowQuests] = useState(initialQuestsOpen);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/friends")
      .then((r) => r.json())
      .then((d) =>
        setFriends((d.friends ?? []).map((e: { user: Person }) => e.user))
      )
      .catch(() => {});
    fetch("/api/personas")
      .then((r) => r.json())
      .then((d) => setPersonas(d.personas ?? []))
      .catch(() => {});
  }, []);

  // Escape closes; the hub behind the sheet must not scroll.
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

  function toggleFriend(id: string) {
    setPickedFriends((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function create(payload: {
    personaId?: string | null;
    friendIds?: string[];
    name?: string;
  }) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setError(d.error ?? "Couldn't start the chat.");
      else onCreated(d.group.id);
    } finally {
      setBusy(false);
    }
  }

  const tiles = strangerEnabled
    ? TILES
    : TILES.filter((tile) => tile.id !== "meet");
  const visibleFriends = friends.filter((f) =>
    (f.name || f.email).toLowerCase().includes(friendQuery.trim().toLowerCase())
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
        aria-labelledby="compose-title"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl border-2 border-border bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:rounded-3xl sm:pb-5"
      >
        <div className="flex items-center justify-between">
          <h2 id="compose-title" className="font-display text-lg font-bold">
            New chat
          </h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted/70 transition-colors hover:bg-indigo-ai/10 hover:text-indigo-ai"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {tiles.map((tile) => (
            <button
              key={tile.id}
              onClick={() => onModeChange(tile.id)}
              className={`flex flex-col items-center gap-1 rounded-2xl border-2 py-2.5 text-xs font-bold transition-colors ${
                mode === tile.id
                  ? "border-indigo-ai bg-indigo-ai/10 text-indigo-ai"
                  : "border-border text-muted hover:border-indigo-ai/50"
              }`}
            >
              <span className="text-lg">{tile.icon}</span>
              {tile.label}
            </button>
          ))}
        </div>

        {mode === "ai" && (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-xs text-muted">Tap a persona to start chatting.</p>
            {personas.map((p) => (
              <button
                key={p.id}
                onClick={() => create({ personaId: p.id })}
                disabled={busy}
                className="flex items-center gap-3 rounded-2xl border-2 border-border px-3 py-2.5 text-left transition-colors hover:border-indigo-ai disabled:opacity-60"
              >
                <span className="text-xl">{p.avatar}</span>
                <span className="font-bold">{p.name}</span>
                <span className="ml-auto text-indigo-ai">→</span>
              </button>
            ))}

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Link
                href="/chat/personas"
                onClick={onClose}
                className="rounded-full border-2 border-border px-3 py-1.5 text-xs font-bold text-muted transition-colors hover:border-indigo-ai hover:text-indigo-ai"
              >
                Manage personas
              </Link>
              <button
                onClick={() => setShowQuests((open) => !open)}
                className="rounded-full border-2 border-border px-3 py-1.5 text-xs font-bold text-muted transition-colors hover:border-indigo-ai hover:text-indigo-ai"
                aria-expanded={showQuests}
              >
                Roleplay quest
              </button>
            </div>

            {showQuests && (
              <div className="mt-2">
                <QuestLauncher onStartQuest={onQuest} />
              </div>
            )}
          </div>
        )}

        {mode === "friend" && (
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 rounded-full border-2 border-border bg-card px-4 py-2">
              <input
                value={friendQuery}
                onChange={(e) => setFriendQuery(e.target.value)}
                placeholder="Find a friend…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted/60"
              />
            </div>
            {visibleFriends.length === 0 ? (
              <p className="py-2 text-xs text-muted">
                No friends match yet. Add someone first.
              </p>
            ) : (
              visibleFriends.map((f) => (
                <button
                  key={f.id}
                  onClick={() => create({ friendIds: [f.id] })}
                  disabled={busy}
                  className="flex items-center gap-3 rounded-2xl border-2 border-border px-3 py-2.5 text-left transition-colors hover:border-indigo-ai disabled:opacity-60"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-ai/15 text-xs font-bold uppercase text-indigo-ai">
                    {(f.name || f.email).charAt(0)}
                  </span>
                  <span className="min-w-0 truncate font-bold">
                    {f.name || f.email}
                  </span>
                  <span className="ml-auto text-indigo-ai">→</span>
                </button>
              ))
            )}
            <Link
              href="/friends"
              onClick={onClose}
              className="mt-1 self-start rounded-full border-2 border-border px-3 py-1.5 text-xs font-bold text-muted transition-colors hover:border-indigo-ai hover:text-indigo-ai"
            >
              Add a friend
            </Link>
          </div>
        )}

        {mode === "group" && (
          <div className="mt-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name (optional)"
              className="w-full rounded-full border-2 border-border bg-card px-4 py-2 text-sm outline-none focus:border-indigo-ai"
            />

            <p className="mt-4 mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">
              Friends to invite (up to 4)
            </p>
            {friends.length === 0 ? (
              <p className="text-xs text-muted">Add friends first to invite them.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {friends.map((f) => (
                  <Chip
                    key={f.id}
                    active={pickedFriends.has(f.id)}
                    onClick={() => toggleFriend(f.id)}
                  >
                    {f.name || f.email}
                  </Chip>
                ))}
              </div>
            )}

            <p className="mt-4 mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">
              AI persona (one, optional)
            </p>
            <div className="flex flex-wrap gap-2">
              {personas.map((p) => (
                <Chip
                  key={p.id}
                  active={personaId === p.id}
                  onClick={() =>
                    setPersonaId((cur) => (cur === p.id ? null : p.id))
                  }
                >
                  {p.avatar} {p.name}
                </Chip>
              ))}
            </div>

            <button
              onClick={() =>
                create({
                  name: name.trim(),
                  friendIds: [...pickedFriends],
                  personaId,
                })
              }
              disabled={busy || (pickedFriends.size === 0 && !personaId)}
              className="mt-4 w-full rounded-full bg-indigo-ai py-2.5 text-sm font-bold text-white disabled:opacity-40"
            >
              {busy ? "Creating…" : "Create group"}
            </button>
            <p className="mt-2 text-center text-xs text-muted">
              Invited friends get a request they can accept.
            </p>
          </div>
        )}

        {mode === "meet" && (
          <div className="mt-4 text-center">
            <p className="mx-auto max-w-xs text-sm text-muted">
              One-on-one, text only. You&apos;re both anonymous and either of you
              can skip at any time.
            </p>
            <button
              onClick={onMeet}
              className="mt-4 min-h-12 w-full rounded-full bg-indigo-ai px-5 font-display text-sm font-bold text-white shadow-md shadow-indigo-ai/25 transition-colors hover:bg-indigo-deep"
            >
              Meet someone →
            </button>
            <p className="mt-2 text-xs text-muted">
              Nothing is added to your conversation list.
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
  );
}
