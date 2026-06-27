"use client";

import { useEffect, useRef, useState } from "react";
import { summarizeConversation } from "@/lib/gemini";

type Msg = { role: "kai" | "user"; content: string };

export default function ChatMenu({
  messages,
  onCleared,
  onCompacted,
}: {
  messages: Msg[];
  onCleared: () => void;
  onCompacted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<null | "clear" | "compact">(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirmClear(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function clearChat() {
    setBusy("clear");
    await fetch("/api/chat/messages", { method: "DELETE" });
    setBusy(null);
    setOpen(false);
    setConfirmClear(false);
    onCleared();
  }

  async function compact() {
    setBusy("compact");
    try {
      // Summarize the older portion (everything but the last few turns).
      const older = messages.slice(0, Math.max(0, messages.length - 8));
      let summary = "";
      if (older.length > 0) {
        try {
          summary = await summarizeConversation(older);
        } catch {
          summary = ""; // proceed without a recap if the model call fails
        }
      }
      await fetch("/api/chat/compact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary }),
      });
      onCompacted();
    } finally {
      setBusy(null);
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-indigo-ai/10 hover:text-indigo-ai"
        aria-label="Chat options"
      >
        <span className="text-xl leading-none">⋯</span>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-60 rounded-2xl border-2 border-border bg-card p-1.5 shadow-xl">
          <button
            onClick={compact}
            disabled={busy !== null}
            className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-indigo-ai/5 disabled:opacity-60"
          >
            <span className="text-lg">🗜️</span>
            <span>
              <span className="block text-sm font-bold">
                {busy === "compact" ? "Compacting…" : "Compact chat"}
              </span>
              <span className="block text-xs text-muted">
                Summarize older messages, keep recent ones. Kai still remembers.
              </span>
            </span>
          </button>

          {confirmClear ? (
            <div className="rounded-xl bg-sakura/5 px-3 py-2.5">
              <p className="text-sm font-bold text-sakura">Clear everything?</p>
              <p className="mb-2 text-xs text-muted">This can&apos;t be undone.</p>
              <div className="flex gap-2">
                <button
                  onClick={clearChat}
                  disabled={busy !== null}
                  className="rounded-full bg-sakura px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                >
                  {busy === "clear" ? "Clearing…" : "Yes, clear"}
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="rounded-full border-2 border-border px-3 py-1.5 text-xs font-bold text-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-sakura/5"
            >
              <span className="text-lg">🗑️</span>
              <span>
                <span className="block text-sm font-bold text-sakura">
                  Clear chat
                </span>
                <span className="block text-xs text-muted">
                  Delete the whole conversation.
                </span>
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
