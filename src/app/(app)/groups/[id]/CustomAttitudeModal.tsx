"use client";

import { useEffect, useState } from "react";
import type { KaiModeInfo } from "./group-types";

const EMOJI_SUGGESTIONS = ["✨", "🌸", "⚡", "🌙", "🦊", "🦉", "🍵", "🍙", "🎭", "🤖", "🔥", "🐱"];

export default function CustomAttitudeModal({
  mode,
  onClose,
  onSaved,
  onDeleted,
}: {
  /** null when creating new; existing mode when editing */
  mode: KaiModeInfo | null;
  onClose: () => void;
  onSaved: (savedMode: KaiModeInfo) => void;
  onDeleted?: (id: string) => void;
}) {
  const [label, setLabel] = useState(mode?.label ?? "");
  const [avatar, setAvatar] = useState(mode?.avatar ?? "✨");
  const [personality, setPersonality] = useState(mode?.personality ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const cleanLabel = label.trim();
    const cleanPrompt = personality.trim();
    if (!cleanLabel) {
      setError("Please give the attitude a name.");
      return;
    }
    if (!cleanPrompt) {
      setError("Please describe how Kai should speak.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (mode) {
        // Edit existing
        const res = await fetch(`/api/personas/${mode.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: cleanLabel,
            label: cleanLabel,
            avatar: avatar.trim() || "✨",
            personality: cleanPrompt,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "Failed to update attitude.");
          return;
        }
        onSaved({
          id: mode.id,
          label: cleanLabel,
          avatar: avatar.trim() || "✨",
          personality: cleanPrompt,
          mine: true,
          builtin: false,
        });
        onClose();
      } else {
        // Create new
        const res = await fetch("/api/personas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: cleanLabel,
            label: cleanLabel,
            avatar: avatar.trim() || "✨",
            personality: cleanPrompt,
            kind: "kai_mode",
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          persona?: { id: string; label?: string; avatar: string; personality: string };
          error?: string;
        };
        if (!res.ok || !data.persona?.id) {
          setError(data.error ?? "Failed to create attitude.");
          return;
        }
        onSaved({
          id: data.persona.id,
          label: data.persona.label ?? cleanLabel,
          avatar: data.persona.avatar ?? avatar,
          personality: data.persona.personality ?? cleanPrompt,
          mine: true,
          builtin: false,
        });
        onClose();
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!mode) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/personas/${mode.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to delete attitude.");
        return;
      }
      onDeleted?.(mode.id);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-attitude-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-t-3xl border-2 border-border bg-card p-5 sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 id="custom-attitude-title" className="font-display text-lg font-bold">
            {mode ? "Edit Kai's attitude" : "New custom attitude for Kai"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-indigo-ai/10 hover:text-indigo-ai"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-xs text-muted">
          Customize how Kai talks in this conversation without changing Kai&apos;s memories or identity.
        </p>

        {error && (
          <div className="mt-3 rounded-xl bg-sakura/10 px-3 py-2 text-xs font-semibold text-sakura">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="mt-4 flex flex-col gap-3.5 overflow-y-auto">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted">
              Attitude Name
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Sassy, Sensei, Poetic, Cheerful"
              maxLength={24}
              className="mt-1 w-full rounded-xl border-2 border-border bg-bg/50 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-ai"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted">
              Emoji Icon
            </label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {EMOJI_SUGGESTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatar(emoji)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border-2 text-base transition-colors ${
                    avatar === emoji
                      ? "border-indigo-ai bg-indigo-ai/10"
                      : "border-border hover:border-indigo-ai/50"
                  }`}
                >
                  {emoji}
                </button>
              ))}
              <input
                type="text"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value.slice(0, 4))}
                className="h-8 w-14 rounded-lg border-2 border-border bg-bg/50 px-2 text-center text-sm outline-none focus:border-indigo-ai"
                title="Custom emoji"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted">
              Kai&apos;s Voice &amp; Instructions
            </label>
            <textarea
              rows={4}
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              placeholder="Describe how Kai should talk, e.g.:
Speak as Kai in a cheeky, witty way: tease playfully, use slang, and keep the energy high and fun."
              className="mt-1 w-full rounded-xl border-2 border-border bg-bg/50 px-3 py-2 text-xs leading-relaxed outline-none focus:border-indigo-ai"
              required
            />
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 pt-2 border-t border-border/80">
            {mode?.mine ? (
              confirmDelete ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleDelete()}
                    className="rounded-full bg-sakura px-3 py-1.5 text-xs font-bold text-white hover:bg-sakura/90 disabled:opacity-50"
                  >
                    Confirm delete
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-full border border-border px-2.5 py-1.5 text-xs font-bold text-muted hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-full px-2 py-1 text-xs font-bold text-sakura hover:bg-sakura/10"
                >
                  Delete
                </button>
              )
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border-2 border-border px-4 py-1.5 text-xs font-bold text-muted hover:border-indigo-ai/50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-full bg-indigo-ai px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-indigo-deep disabled:opacity-50"
              >
                {busy ? "Saving…" : mode ? "Save changes" : "Create attitude"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
