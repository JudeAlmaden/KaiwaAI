"use client";

import { useState } from "react";

// Owner-only: set the Gemini API key(s) that power this group's AI personas.
// Keys are sent once and stored encrypted server-side (never returned).
export default function GroupKeyDialog({
  groupId,
  hasKey,
  onClose,
  onSaved,
}: {
  groupId: string;
  hasKey: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(keys: string[]) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Couldn't save.");
      } else {
        onSaved();
      }
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    const keys = text
      .split(/[\n,]/)
      .map((k) => k.trim())
      .filter(Boolean);
    if (keys.length === 0) return;
    save(keys);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border-2 border-border bg-card p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg font-bold">Group API key</h2>
        <p className="mt-1 text-sm text-muted">
          As the owner, your Gemini API key powers every AI persona in this
          group. It&apos;s stored encrypted and never shown again. Paste one key
          per line to rotate through several.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="AIza..."
          className="mt-3 w-full rounded-2xl border-2 border-border bg-card px-3 py-2 text-sm outline-none focus:border-indigo-ai"
        />
        {error && <p className="mt-2 text-xs font-semibold text-sakura">{error}</p>}
        <div className="mt-4 flex items-center justify-between gap-2">
          {hasKey ? (
            <button
              onClick={() => save([])}
              disabled={busy}
              className="text-xs font-bold text-sakura hover:underline"
            >
              Remove key
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
              onClick={submit}
              disabled={busy || !text.trim()}
              className="rounded-full bg-indigo-ai px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
