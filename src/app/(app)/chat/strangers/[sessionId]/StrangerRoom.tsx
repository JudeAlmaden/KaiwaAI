"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MAX_MESSAGE_CHARS, charLength } from "@/lib/types";

type Msg = {
  id: string;
  body: string;
  alias: string;
  mine: boolean;
  createdAt: string;
};

type View = {
  session: {
    id: string;
    status: string;
    endReason: string | null;
    createdAt: string;
    endedAt: string | null;
    expiresAt: string;
  };
  me: { alias: string; leftAt: string | null };
  partner: { alias: string; leftAt: string | null; lastSeenAt: string } | null;
  messages: Msg[];
};

function dayLabel(iso: string, today: string): string {
  const d = new Date(iso);
  if (d.toDateString() === today) return "Today";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function StrangerRoom({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [view, setView] = useState<View | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  const [left, setLeft] = useState(false);
  const [presence, setPresence] = useState<
    "here" | "away" | "left" | null
  >(null);
  // Snapshot of "today" so the day dividers don't depend on render-time clocks.
  const [sessionDay] = useState(() => new Date().toDateString());

  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const seenRef = useRef<Set<string>>(new Set());
  const didScroll = useRef(false);
  // Stable handle on the latest messages for the polling closure.
  const lastMessageRef = useRef<Msg[]>([]);

  const merge = useCallback((incoming: Msg[]) => {
    if (incoming.length === 0) return;
    setMessages((cur) => {
      const next = [...cur];
      for (const m of incoming) {
        if (seenRef.current.has(m.id)) continue;
        seenRef.current.add(m.id);
        next.push(m);
      }
      return next;
    });
  }, []);

  const applyView = useCallback(
    (d: View) => {
      setView(d);
      const partner = d.partner;
      setPresence(
        !partner
          ? null
          : partner.leftAt
            ? "left"
            : Date.now() - new Date(partner.lastSeenAt).getTime() < 45_000
              ? "here"
              : "away"
      );
      if (d.session.status !== "active" || d.partner?.leftAt) setLeft(true);
      merge(d.messages);
    },
    [merge]
  );

  // Initial load + 2 s polling. `after` is the last real message id so a poll
  // only returns what we don't have yet.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      const loaded = lastMessageRef.current;
      const last = loaded[loaded.length - 1];
      const lastId = last && !last.id.startsWith("tmp-") ? last.id : null;
      const url = `/api/stranger/sessions/${sessionId}${
        lastId ? `?after=${encodeURIComponent(lastId)}` : ""
      }`;

      try {
        const res = await fetch(url);
        if (cancelled) return;
        if (res.status === 404) {
          setGone(true);
          return;
        }
        if (res.ok) {
          const d = (await res.json()) as View;
          applyView(d);
          if (d.session.status !== "active" || d.partner?.leftAt) return;
        }
      } catch {
        // best-effort polling
      }

      if (!cancelled) timer = setTimeout(tick, 2000);
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId, applyView]);

  useEffect(() => {
    lastMessageRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) return;
    if (!didScroll.current) {
      didScroll.current = true;
      endRef.current?.scrollIntoView();
      return;
    }
    if (atBottomRef.current) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const len = charLength(input);
  const over = len > MAX_MESSAGE_CHARS;
  const closed =
    gone || left || (view !== null && view.session.status !== "active");

  async function send() {
    const content = input.trim();
    if (!content || over || sending || closed) return;
    setSending(true);
    setError(null);
    setInput("");

    const tmp: Msg = {
      id: `tmp-${Date.now()}`,
      body: content,
      alias: view?.me.alias ?? "you",
      mine: true,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, tmp]);
    atBottomRef.current = true;

    try {
      const res = await fetch(`/api/stranger/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessages((m) => m.filter((x) => x.id !== tmp.id));
        setInput(content);
        setError(d.error ?? "Couldn't send that. Try again.");
        return;
      }
      setMessages((m) => m.filter((x) => x.id !== tmp.id));
      merge([d.message as Msg]);
    } catch {
      setMessages((m) => m.filter((x) => x.id !== tmp.id));
      setInput(content);
      setError("Couldn't send that. Try again.");
    } finally {
      setSending(false);
    }
  }

  async function leave(reason: "skip" | "leave") {
    try {
      await fetch(`/api/stranger/sessions/${sessionId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
    } catch {
      // leaving is best-effort; the room expires on its own
    }
    // Skipping drops straight back into matching on the hub; leaving lands on
    // the inbox without starting a search.
    router.push(reason === "skip" ? "/chat?queue=1" : "/chat");
  }

  if (gone) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="font-display text-lg font-bold">This chat has ended</p>
        <p className="mt-1 text-sm text-muted">Rooms disappear when they&apos;re over.</p>
        <Link
          href="/chat?queue=1"
          className="mt-4 rounded-full bg-indigo-ai px-5 py-2.5 text-sm font-bold text-white"
        >
          Find someone new
        </Link>
      </div>
    );
  }

  const partnerAlias = view?.partner?.alias ?? "Stranger";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b-2 border-border bg-card/90 px-3 backdrop-blur-xl sm:px-8">
        <button
          onClick={() => leave("leave")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-border text-muted transition-colors hover:border-indigo-ai hover:text-indigo-ai"
          aria-label="Leave the chat"
        >
          ←
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-extrabold">
            {partnerAlias}
          </p>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
            {presence === "here" && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-mint"
                aria-hidden
              />
            )}
            <span className="truncate">
              匿名 ·{" "}
              {presence === "here"
                ? "here now"
                : presence === "away"
                  ? "away"
                  : presence === "left"
                    ? "left the chat"
                    : "anonymous stranger"}
            </span>
          </p>
        </div>

        <button
          onClick={() => leave("skip")}
          className="min-h-11 shrink-0 rounded-full border-2 border-border px-3.5 text-xs font-bold text-muted transition-colors hover:border-indigo-ai hover:text-indigo-ai"
        >
          Next →
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            atBottomRef.current =
              el.scrollHeight - el.scrollTop - el.clientHeight < 120;
          }}
          className="h-full overflow-y-auto px-4 py-5 sm:px-8"
        >
          <div className="mx-auto flex max-w-2xl flex-col">
            <p className="mb-3 text-center text-xs text-muted">
              You&apos;re both anonymous. Say hi 👋
            </p>

            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const next = messages[i + 1];
              const sameAsPrev = !!prev && prev.mine === m.mine;
              const newDay =
                !prev ||
                new Date(prev.createdAt).toDateString() !==
                  new Date(m.createdAt).toDateString();
              const lastOfGroup = !next || next.mine !== m.mine;
              return (
                <div key={m.id}>
                  {newDay && (
                    <div className="mb-3 mt-4 flex items-center gap-3">
                      <span className="h-px flex-1 bg-border" />
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted/60">
                        {dayLabel(m.createdAt, sessionDay)}
                      </span>
                      <span className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  <div
                    className={`flex flex-col ${m.mine ? "items-end" : "items-start"} ${
                      sameAsPrev ? "mt-1" : newDay ? "mt-0" : "mt-3"
                    }`}
                  >
                    {!sameAsPrev && !m.mine && (
                      <span className="mb-1 px-1 text-[10px] font-bold text-muted">
                        {m.alias}
                      </span>
                    )}
                    <div
                      className={`max-w-[78%] break-words rounded-2xl px-3.5 py-2 text-sm ${
                        m.mine
                          ? "rounded-br-md bg-indigo-ai text-white shadow-sm shadow-indigo-ai/20"
                          : "rounded-bl-md border-2 border-border bg-card"
                      }`}
                    >
                      {m.body}
                    </div>
                    {lastOfGroup && (
                      <span className="mt-1 px-1 text-[10px] font-semibold text-muted/60">
                        {new Date(m.createdAt).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {sending && (
              <span className="text-xs text-muted" role="status">
                Sending…
              </span>
            )}
            <div ref={endRef} />
          </div>
        </div>
      </div>

      {closed ? (
        <div className="border-t-2 border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-8">
          <div className="mx-auto max-w-2xl">
            <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-border bg-card px-4 py-3 text-center">
              <p className="text-sm text-muted">
                {left ? "They slipped away." : "This chat has ended."}
              </p>
              <button
                onClick={() => router.push("/chat?queue=1")}
                className="min-h-11 rounded-full bg-indigo-ai px-5 font-display text-sm font-bold text-white shadow-md shadow-indigo-ai/25 transition-colors hover:bg-indigo-deep"
              >
                Find someone new
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t-2 border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-8">
          <div className="mx-auto max-w-2xl">
            {error && (
              <p className="mb-2 text-center text-xs font-semibold text-sakura">
                {error}
              </p>
            )}
            <div className="flex items-center gap-2 rounded-full border-2 border-border bg-card px-4 py-2 transition-colors focus-within:border-indigo-ai/60">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Message…"
                aria-label="Message"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted/60"
              />
              {len > MAX_MESSAGE_CHARS * 0.8 && (
                <span
                  className={`text-xs font-semibold tabular-nums ${
                    over
                      ? "font-bold text-sakura"
                      : len > MAX_MESSAGE_CHARS * 0.9
                        ? "text-amber"
                        : "text-muted/60"
                  }`}
                >
                  {MAX_MESSAGE_CHARS - len}
                </span>
              )}
              <button
                onClick={send}
                disabled={sending || over || !input.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-ai text-white shadow-sm transition-all hover:bg-indigo-deep disabled:opacity-40"
                aria-label="Send"
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
