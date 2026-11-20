"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStrangerQueue } from "./useStrangerQueue";

/**
 * Queue dialog for random matching, mounted from the Meet tab in `/chat`.
 *
 * It exists instead of a lobby page: one tap opens it already searching, a match
 * closes it into the room, and closing it drops the queue row. The card visuals
 * come from the same tokens as the rest of the hub.
 */
export default function StrangerQueueModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const router = useRouter();
  const { state, retry, cancel } = useStrangerQueue();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [now, setNow] = useState(() => Date.now());

  const close = useCallback(async () => {
    await cancel();
    onClose();
  }, [cancel, onClose]);

  // Focus the always-present control, and let Escape leave the queue.
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") void close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  // The hub is still visible behind the backdrop; don't let it scroll.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Elapsed clock while waiting.
  useEffect(() => {
    if (state.status !== "searching") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.status]);

  // A match is transient: acknowledge it, then hand over to the room.
  useEffect(() => {
    if (state.status !== "matched") return;
    const sessionId = state.sessionId;
    const id = setTimeout(() => {
      router.push(`/chat/strangers/${sessionId}`);
      onClose();
    }, 450);
    return () => clearTimeout(id);
  }, [state, router, onClose]);

  const elapsed =
    state.status === "searching" && state.since
      ? Math.max(0, Math.floor((now - new Date(state.since).getTime()) / 1000))
      : 0;
  const clock = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

  const title =
    state.status === "matched"
      ? "Found someone!"
      : state.status === "limited"
        ? "Take a breather"
        : state.status === "error"
          ? "Couldn't start the search"
          : "Looking for someone…";

  const description =
    state.status === "matched"
      ? "Opening the room…"
      : state.status === "limited"
        ? `The door reopens in about ${state.minutes} min.`
        : state.status === "error"
          ? state.reason === "expired"
            ? "That search timed out."
            : "Couldn't reach the queue."
          : state.alias
            ? `You're “${state.alias}” in this chat.`
            : "You're both anonymous.";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm"
      onClick={() => void close()}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stranger-queue-title"
        aria-describedby="stranger-queue-desc"
        onClick={(event) => event.stopPropagation()}
        className="w-[min(92vw,26rem)] rounded-3xl border-2 border-border bg-card p-5 text-center shadow-2xl"
      >
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-ai/10 text-3xl ring-2 ring-indigo-ai/20 ${
            state.status === "searching"
              ? "animate-pulse motion-reduce:animate-none"
              : ""
          }`}
        >
          🌍
        </div>

        <h2
          id="stranger-queue-title"
          className="mt-4 font-display text-lg font-extrabold"
        >
          {title}
        </h2>
        <p
          id="stranger-queue-desc"
          role="status"
          aria-live="polite"
          className="mt-1 text-sm text-muted"
        >
          {description}
        </p>

        {state.status === "searching" && (
          <p className="mt-2 text-sm font-semibold tabular-nums text-muted">
            {clock}
          </p>
        )}

        {state.status === "limited" && (
          <p className="mx-auto mt-3 max-w-xs rounded-2xl bg-amber/10 px-3 py-2 text-xs font-semibold text-amber">
            You&apos;ve met a few people just now.
          </p>
        )}

        <div className="mt-5 flex flex-col items-center gap-2">
          {state.status === "matched" ? null : state.status === "error" ? (
            <>
              <button
                onClick={retry}
                className="min-h-11 w-full max-w-xs rounded-full bg-indigo-ai px-5 font-display text-sm font-bold text-white shadow-md shadow-indigo-ai/25 transition-colors hover:bg-indigo-deep"
              >
                Try again
              </button>
              <button
                ref={cancelRef}
                onClick={() => void close()}
                className="min-h-11 rounded-full border-2 border-border px-4 text-sm font-bold text-muted transition-colors hover:border-indigo-ai hover:text-indigo-ai"
              >
                Close
              </button>
            </>
          ) : state.status === "limited" ? (
            <button
              ref={cancelRef}
              onClick={() => void close()}
              className="min-h-11 rounded-full border-2 border-border px-4 text-sm font-bold text-muted transition-colors hover:border-indigo-ai hover:text-indigo-ai"
            >
              Close
            </button>
          ) : (
            <button
              ref={cancelRef}
              onClick={() => void close()}
              className="min-h-11 rounded-full border-2 border-border px-6 text-sm font-bold text-muted transition-colors hover:border-indigo-ai hover:text-indigo-ai"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
