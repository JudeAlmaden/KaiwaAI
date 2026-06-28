"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DotsThree } from "@phosphor-icons/react/dist/ssr";

// Three-dots options for a conversation: view the persona's memory, clear
// messages (any member), and delete the whole conversation (owner only).
export default function ConvMenu({
  isOwner,
  personaId,
  onClear,
  onDelete,
}: {
  isOwner: boolean;
  personaId?: string | null;
  onClear: () => Promise<void> | void;
  onDelete: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<null | "clear" | "delete">(null);
  const [confirm, setConfirm] = useState<null | "clear" | "delete">(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirm(null);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function run(kind: "clear" | "delete") {
    setBusy(kind);
    try {
      if (kind === "clear") await onClear();
      else await onDelete();
    } finally {
      setBusy(null);
      setOpen(false);
      setConfirm(null);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-indigo-ai/10 hover:text-indigo-ai"
        aria-label="Conversation options"
      >
        <DotsThree size={22} weight="bold" />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-64 rounded-2xl border-2 border-border bg-card p-1.5 shadow-xl">
          {/* View this persona's memory */}
          {personaId && (
            <Link
              href={`/memory?persona=${encodeURIComponent(personaId)}`}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-indigo-ai/5"
            >
              <span className="text-lg">🧠</span>
              <span>
                <span className="block text-sm font-bold">View memory</span>
                <span className="block text-xs text-muted">
                  See and edit what this persona remembers about you.
                </span>
              </span>
            </Link>
          )}

          {/* Clear messages */}
          {confirm === "clear" ? (
            <ConfirmRow
              title="Clear all messages?"
              note="Removes the messages for everyone. Saved memories are kept. This can't be undone."
              actionLabel={busy === "clear" ? "Clearing…" : "Clear"}
              onConfirm={() => run("clear")}
              onCancel={() => setConfirm(null)}
              disabled={busy !== null}
            />
          ) : (
            <button
              onClick={() => setConfirm("clear")}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-indigo-ai/5"
            >
              <span className="text-lg">🧹</span>
              <span>
                <span className="block text-sm font-bold">Clear messages</span>
                <span className="block text-xs text-muted">
                  Empty this conversation, keep it in your list.
                </span>
              </span>
            </button>
          )}

          {/* Delete conversation (owner only) */}
          {isOwner &&
            (confirm === "delete" ? (
              <ConfirmRow
                title="Delete conversation?"
                note="Permanently deletes the conversation and all its messages for everyone. This can't be undone."
                actionLabel={busy === "delete" ? "Deleting…" : "Delete"}
                onConfirm={() => run("delete")}
                onCancel={() => setConfirm(null)}
                disabled={busy !== null}
              />
            ) : (
              <button
                onClick={() => setConfirm("delete")}
                className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-sakura/5"
              >
                <span className="text-lg">🗑️</span>
                <span>
                  <span className="block text-sm font-bold text-sakura">
                    Delete conversation
                  </span>
                  <span className="block text-xs text-muted">
                    Remove it for everyone, permanently.
                  </span>
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

function ConfirmRow({
  title,
  note,
  actionLabel,
  onConfirm,
  onCancel,
  disabled,
}: {
  title: string;
  note: string;
  actionLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  disabled: boolean;
}) {
  return (
    <div className="rounded-xl bg-sakura/5 px-3 py-2.5">
      <p className="text-sm font-bold text-sakura">{title}</p>
      <p className="mb-2 text-xs text-muted">{note}</p>
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          disabled={disabled}
          className="rounded-full bg-sakura px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
        >
          {actionLabel}
        </button>
        <button
          onClick={onCancel}
          className="rounded-full border-2 border-border px-3 py-1.5 text-xs font-bold text-muted"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
