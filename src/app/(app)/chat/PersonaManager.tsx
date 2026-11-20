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
  kind?: string;
  label?: string | null;
};

export default function PersonaManager({
  personas,
  onChange,
  onStartChat,
  compact = false,
  showChat = true,
}: {
  personas: Persona[];
  onChange: () => void;
  /** Only needed when the Chat buttons are shown. */
  onStartChat?: (id: string) => void;
  /** Single-column rows for the People sheet instead of the page's card grid. */
  compact?: boolean;
  /** People manages personas; writing to one happens in the New chat sheet. */
  showChat?: boolean;
}) {
  const [editing, setEditing] = useState<Persona | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className={`flex flex-col ${compact ? "gap-2" : "gap-4"}`}>
      <PersonaShell plain={compact}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Your personas</h2>
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
          Characters you made. Kai&apos;s attitudes are chosen inside a chat, not
          here.
        </p>
        {personas.length === 0 && (
          <p className="mt-2 text-xs text-muted">
            You haven&apos;t made a persona yet. Create one to message them or add
            them to a group.
          </p>
        )}

        <div
          className={
            compact
              ? "mt-2 flex flex-col gap-1"
              : "mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
          }
        >
          {personas.map((p) =>
            compact ? (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-2xl px-2 py-2 transition-colors hover:bg-indigo-ai/10"
              >
                <Avatar name={p.name} emoji={p.avatar} size={32} />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{p.name}</span>
                  <span className="block truncate text-[11px] text-muted">
                    {p.blurb || "No description"}
                  </span>
                </div>
                {p.mine && (
                  <button
                    onClick={() => {
                      setEditing(p);
                      setCreating(false);
                    }}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted hover:bg-indigo-ai/10 hover:text-indigo-ai"
                    aria-label={`Edit ${p.name}`}
                    title="Edit"
                  >
                    ⋯
                  </button>
                )}
                {showChat && (
                  <button
                    onClick={() => onStartChat?.(p.id)}
                    className="shrink-0 rounded-full bg-indigo-ai px-3 py-1 text-[11px] font-extrabold text-white transition-colors hover:bg-indigo-deep"
                  >
                    Chat
                  </button>
                )}
              </div>
            ) : (
            <div
              key={p.id}
              className="group/p relative flex flex-col justify-between rounded-2xl border-2 border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-indigo-ai hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <Avatar name={p.name} emoji={p.avatar} size={40} />
                <div className="min-w-0 flex-1">
                  <span className="block truncate font-display font-extrabold text-foreground">{p.name}</span>
                  <span className="mt-0.5 block text-xs text-muted leading-relaxed line-clamp-2" title={p.blurb}>
                    {p.blurb || "No description"}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
                {p.mine ? (
                  <button
                    onClick={() => {
                      setEditing(p);
                      setCreating(false);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-indigo-ai/10 hover:text-indigo-ai"
                    aria-label={`Edit ${p.name}`}
                    title="Edit"
                  >
                    ⋯
                  </button>
                ) : (
                  <span className="rounded-full bg-border/50 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted/80">
                    Preset
                  </span>
                )}
                <button
                  onClick={() => onStartChat?.(p.id)}
                  className="rounded-full bg-indigo-ai px-3 py-1 text-xs font-extrabold text-white transition-colors hover:bg-indigo-deep cursor-pointer"
                >
                  Chat
                </button>
              </div>
            </div>
            )
          )}
        </div>
      </PersonaShell>

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

/** The sheet already draws a card; don't nest another Surface inside it. */
function PersonaShell({
  plain,
  children,
}: {
  plain: boolean;
  children: React.ReactNode;
}) {
  return plain ? (
    <div className="flex flex-col">{children}</div>
  ) : (
    <Surface>{children}</Surface>
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
      if (!res.ok) setError(d.error ?? "Couldn&apos;t save.");
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
            : "Personality / role — e.g. &apos;You are Yuki, a strict but kind kanji coach who loves examples.&apos;"
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
