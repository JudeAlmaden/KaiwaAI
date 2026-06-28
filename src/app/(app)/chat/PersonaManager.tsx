"use client";

import { useState } from "react";
import { Surface } from "../ui";
import Avatar from "./Avatar";

type Persona = {
  id: string;
  name: string;
  blurb: string;
  avatar: string;
  builtin: boolean;
  mine: boolean;
};

export default function PersonaManager({
  personas,
  onChange,
  onStartChat,
}: {
  personas: Persona[];
  onChange: () => void;
  onStartChat: (id: string) => void;
}) {
  const [editing, setEditing] = useState<Persona | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <Surface>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">AI personas</h2>
          <button
            onClick={() => {
              setCreating(true);
              setEditing(null);
            }}
            className="rounded-full bg-indigo-ai px-3 py-1 text-xs font-bold text-white"
          >
            + Create
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">
          Chat 1:1 with any persona, or add one to a group. Make your own and
          rename it however you like.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          {personas.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-2xl border-2 border-border px-3 py-2.5"
            >
              <button
                onClick={() => onStartChat(p.id)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <Avatar name={p.name} emoji={p.avatar} size={40} />
                <span className="min-w-0">
                  <span className="block truncate font-bold">{p.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {p.blurb || "Tap to chat"}
                  </span>
                </span>
              </button>
              {p.mine ? (
                <button
                  onClick={() => {
                    setEditing(p);
                    setCreating(false);
                  }}
                  className="shrink-0 text-xs font-bold text-muted hover:text-indigo-ai"
                >
                  Edit
                </button>
              ) : (
                <span className="shrink-0 rounded-full bg-border/40 px-2 py-0.5 text-[10px] font-bold uppercase text-muted">
                  Preset
                </span>
              )}
            </div>
          ))}
        </div>
      </Surface>

      {(creating || editing) && (
        <PersonaEditor
          persona={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            onChange();
          }}
        />
      )}
    </div>
  );
}

const AVATARS = ["🦊", "🌸", "⚡", "🌙", "🤖", "🐱", "🐼", "🦉", "🌟", "🍵"];

function PersonaEditor({
  persona,
  onClose,
  onSaved,
}: {
  persona: Persona | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(persona?.name ?? "");
  const [blurb, setBlurb] = useState(persona?.blurb ?? "");
  const [avatar, setAvatar] = useState(persona?.avatar ?? "🤖");
  const [personality, setPersonality] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNew = !persona;

  async function save() {
    if (!name.trim() || busy) return;
    // For a brand-new persona, personality is required; when editing an
    // existing one, an empty personality means "leave unchanged".
    if (isNew && !personality.trim()) {
      setError("Give your persona a personality description.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        blurb: blurb.trim(),
        avatar,
        ...(personality.trim() ? { personality: personality.trim() } : {}),
      };
      const res = persona
        ? await fetch(`/api/personas/${persona.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/personas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const d = await res.json();
      if (!res.ok) setError(d.error ?? "Couldn't save.");
      else onSaved();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!persona || !persona.mine || busy) return;
    setBusy(true);
    await fetch(`/api/personas/${persona.id}`, { method: "DELETE" });
    setBusy(false);
    onSaved();
  }

  return (
    <Surface>
      <h3 className="font-display font-bold">
        {isNew ? "Create persona" : "Edit persona"}
      </h3>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {AVATARS.map((a) => (
          <button
            key={a}
            onClick={() => setAvatar(a)}
            className={`rounded-xl border-2 px-2 py-1 text-lg ${
              avatar === a ? "border-indigo-ai bg-indigo-ai/10" : "border-border"
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        className="mt-3 w-full rounded-full border-2 border-border bg-card px-4 py-2 text-sm outline-none focus:border-indigo-ai"
      />
      <input
        value={blurb}
        onChange={(e) => setBlurb(e.target.value)}
        placeholder="Short tagline (optional)"
        className="mt-2 w-full rounded-full border-2 border-border bg-card px-4 py-2 text-sm outline-none focus:border-indigo-ai"
      />
      <textarea
        value={personality}
        onChange={(e) => setPersonality(e.target.value)}
        rows={4}
        placeholder={
          persona
            ? "Personality / role (leave blank to keep current)"
            : "Personality / role — e.g. 'You are Yuki, a strict but kind kanji coach who loves examples.'"
        }
        className="mt-2 w-full rounded-2xl border-2 border-border bg-card px-3 py-2 text-sm outline-none focus:border-indigo-ai"
      />

      {error && <p className="mt-2 text-xs font-semibold text-sakura">{error}</p>}

      <div className="mt-3 flex items-center justify-between">
        {persona?.mine ? (
          <button
            onClick={remove}
            disabled={busy}
            className="text-xs font-bold text-sakura hover:underline"
          >
            Delete
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="rounded-full border-2 border-border px-4 py-1.5 text-sm font-bold text-muted"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={busy || !name.trim()}
            className="rounded-full bg-indigo-ai px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Surface>
  );
}
