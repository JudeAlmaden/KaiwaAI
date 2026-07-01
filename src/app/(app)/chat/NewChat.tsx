"use client";

import { useEffect, useState } from "react";
import { Chip } from "../ui";

type Person = { id: string; name: string | null; email: string };
type Persona = { id: string; name: string; avatar: string; builtin: boolean };

type Mode = "ai" | "dm" | "group";

// Compose modal: start a new conversation — with an AI persona, a friend (DM),
// or a group of friends (+ optionally one persona).
export default function NewChat({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (groupId: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("ai");
  const [friends, setFriends] = useState<Person[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [pickedFriends, setPickedFriends] = useState<Set<string>>(new Set());
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/friends")
      .then((r) => r.json())
      .then((d) => setFriends((d.friends ?? []).map((e: { user: Person }) => e.user)))
      .catch(() => {});
    fetch("/api/personas")
      .then((r) => r.json())
      .then((d) => setPersonas(d.personas ?? []))
      .catch(() => {});
  }, []);

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
      if (!res.ok) setError(d.error ?? "Couldn&apos;t start the chat.");
      else onCreated(d.group.id);
    } finally {
      setBusy(false);
    }
  }

  const modes: { id: Mode; label: string; icon: string }[] = [
    { id: "ai", label: "AI persona", icon: "🤖" },
    { id: "dm", label: "Friend", icon: "👤" },
    { id: "group", label: "Group", icon: "👥" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 py-6 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border-2 border-border bg-card p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">New chat</h2>
          <button
            onClick={onClose}
            className="text-muted/60 hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* mode picker */}
        <div className="mt-3 flex gap-2">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-2xl border-2 py-2.5 text-xs font-bold transition-colors ${
                mode === m.id
                  ? "border-indigo-ai bg-indigo-ai/10 text-indigo-ai"
                  : "border-border text-muted hover:border-indigo-ai/50"
              }`}
            >
              <span className="text-lg">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>

        {/* AI: pick a persona, tap to open */}
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
          </div>
        )}

        {/* DM: pick exactly one friend */}
        {mode === "dm" && (
          <div className="mt-4 flex flex-col gap-2">
            {friends.length === 0 ? (
              <p className="text-xs text-muted">
                Add friends first (Friends tab) to message them.
              </p>
            ) : (
              friends.map((f) => (
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
          </div>
        )}

        {/* Group: name + friends + optional persona */}
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
                  onClick={() => setPersonaId((cur) => (cur === p.id ? null : p.id))}
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

        {error && (
          <p className="mt-3 text-center text-xs font-semibold text-sakura">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
