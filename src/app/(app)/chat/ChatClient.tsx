"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Kai from "../../Kai";
import WordToken from "./WordToken";
import { chatWithKai, proactiveKaiMessage, type PromptContext } from "@/lib/gemini";
import { hasAnyKey } from "@/lib/api-keys";
import { getAutoSaveWords, getModel, setModel, MODELS } from "@/lib/model-config";
import { getProactiveChat, PROACTIVE } from "@/lib/proactive-config";
import ModelSwitcher from "./ModelSwitcher";
import ChatMenu from "./ChatMenu";
import {
  charLength,
  MAX_MESSAGE_CHARS,
  type CachedToken,
} from "@/lib/types";
import { dayLabel } from "@/lib/day";

type QuoteRef = {
  id: string;
  role: "kai" | "user";
  content: string;
} | null;

type Msg = {
  id: string;
  role: "kai" | "user";
  content: string;
  english?: string | null;
  tokens?: string | null;
  dayKey: string;
  createdAt: string;
  pending?: boolean;
  proactive?: boolean;
  replyTo?: QuoteRef;
};

export default function ChatClient({ todayKey }: { todayKey: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [modelTick, setModelTick] = useState(0);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [openToken, setOpenToken] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  // The message the user is quote-replying to (null = normal send).
  const [replyTo, setReplyTo] = useState<QuoteRef>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  // Proactivity bookkeeping (refs so timers read fresh values without re-binding).
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const followupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastOpenerAt = useRef(0);
  const consecutiveKai = useRef(0);
  const busyRef = useRef(false);

  const CACHE_KEY = "kaiwa_chat_cache";

  // Load the latest page; optionally seed instantly from the cached page first.
  const loadLatest = useCallback(() => {
    fetch("/api/chat/messages?limit=25")
      .then((r) => r.json())
      .then((d) => {
        const msgs: Msg[] = d.messages ?? [];
        setMessages(msgs);
        setHasMore(Boolean(d.hasMore));
        stickToBottom.current = true;
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(msgs.slice(-25)));
        } catch {}
      })
      .catch(() => {});
  }, []);

  // Fetch the previous page (older than the topmost loaded message).
  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore || messages.length === 0) return;
    setLoadingOlder(true);
    const oldest = messages[0];
    const el = streamRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    try {
      const res = await fetch(
        `/api/chat/messages?limit=25&before=${oldest.id}`
      );
      const d = await res.json();
      const older: Msg[] = d.messages ?? [];
      if (older.length > 0) {
        stickToBottom.current = false;
        setMessages((m) => [...older, ...m]);
        // preserve scroll position after older messages are prepended
        requestAnimationFrame(() => {
          if (el) el.scrollTop = el.scrollHeight - prevHeight;
        });
      }
      setHasMore(Boolean(d.hasMore));
    } catch {
    } finally {
      setLoadingOlder(false);
    }
  }, [loadingOlder, hasMore, messages]);

  useEffect(() => {
    setHasKey(hasAnyKey());
    // Paint cached messages immediately, then refresh from the server.
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) setMessages(JSON.parse(cached));
    } catch {}
    loadLatest();
  }, [loadLatest]);

  useEffect(() => {
    if (stickToBottom.current) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Trigger older-page load when scrolled near the top.
  function onScroll() {
    const el = streamRef.current;
    if (el && el.scrollTop < 80) loadOlder();
  }

  const len = charLength(input);
  const over = len > MAX_MESSAGE_CHARS;

  async function send() {
    const text = input.trim();
    if (!text || over || sending) return;
    setError(null);
    setNotice(null);
    setSending(true);
    busyRef.current = true;
    setInput("");
    // The user replied — reset Kai's consecutive-message counter and cancel
    // any pending proactive follow-up.
    consecutiveKai.current = 0;
    clearTimers();

    const quoted = replyTo;
    setReplyTo(null);

    const tempUser: Msg = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: text,
      dayKey: todayKey,
      createdAt: new Date().toISOString(),
      pending: true,
      replyTo: quoted,
    };
    setMessages((m) => [...m, tempUser]);
    stickToBottom.current = true;

    try {
      const ctxRes = await fetch("/api/chat/context");
      if (!ctxRes.ok) throw new Error("Couldn't load context.");
      const ctx = (await ctxRes.json()) as PromptContext;

      const kai = await chatWithKai(
        text,
        ctx,
        quoted ? { role: quoted.role, content: quoted.content } : undefined
      );

      // If auto-fallback used a different model than selected, adopt it so the
      // switcher reflects reality and future turns start from the working one.
      if (kai.usedModel && kai.usedModel !== getModel()) {
        setModel(kai.usedModel);
        setModelTick((t) => t + 1);
        const label =
          MODELS.find((m) => m.id === kai.usedModel)?.label ?? kai.usedModel;
        setNotice(`Switched to ${label} (your model was busy).`);
      }

      const saveRes = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userText: text,
          reply: kai.reply,
          english: kai.english,
          tokens: kai.tokens,
          newWords: kai.newWords,
          autoSave: getAutoSaveWords(),
          replyToId: quoted?.id,
        }),
      });
      if (!saveRes.ok) throw new Error("Couldn't save the message.");
      const saved = await saveRes.json();

      setMessages((m) => {
        const next = [
          ...m.filter((x) => x.id !== tempUser.id),
          saved.userMessage,
          saved.kaiMessage,
        ];
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(next.slice(-25)));
        } catch {}
        return next;
      });
      // Kai just answered once — maybe she adds a spontaneous follow-up.
      consecutiveKai.current = 1;
      maybeScheduleFollowup();
    } catch (e) {
      setMessages((m) => m.filter((x) => x.id !== tempUser.id));
      setInput(text);
      if (quoted) setReplyTo(quoted);
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      if (msg === "NO_API_KEY") setHasKey(false);
      else if (msg === "BAD_API_KEY")
        setError("That Gemini key was rejected. Check it in Settings.");
      else if (msg === "RATE_LIMIT")
        setError(
          "Gemini's rate limit hit (free tier). Wait a moment, or pick a lighter model in Settings."
        );
      else if (msg === "TRUNCATED")
        setError(
          "That reply got cut off. Try a higher reply-length cap in Settings, or send again."
        );
      else setError(msg);
    } finally {
      setSending(false);
      busyRef.current = false;
      scheduleIdleOpener();
    }
  }

  function clearTimers() {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (followupTimer.current) clearTimeout(followupTimer.current);
    idleTimer.current = null;
    followupTimer.current = null;
  }

  // Generate + persist a Kai-initiated message (opener or follow-up). Quietly
  // no-ops on any failure — proactivity should never surface errors.
  const sendProactive = useCallback(
    async (kind: "opener" | "followup", quoted?: QuoteRef) => {
      if (busyRef.current) return;
      if (!getProactiveChat()) return;
      if (document.hidden) return; // only when the user is actually looking
      if (consecutiveKai.current >= PROACTIVE.maxConsecutive) return;
      busyRef.current = true;
      try {
        const ctxRes = await fetch("/api/chat/context");
        if (!ctxRes.ok) return;
        const ctx = (await ctxRes.json()) as PromptContext;

        const kai = await proactiveKaiMessage(ctx, {
          kind,
          quoted: quoted
            ? { role: quoted.role, content: quoted.content }
            : undefined,
        });

        const saveRes = await fetch("/api/chat/kai-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reply: kai.reply,
            english: kai.english,
            tokens: kai.tokens,
            proactive: true,
            replyToId: quoted?.id,
          }),
        });
        if (!saveRes.ok) return;
        const saved = await saveRes.json();

        stickToBottom.current = true;
        setMessages((m) => {
          const next = [...m, saved.kaiMessage];
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(next.slice(-25)));
          } catch {}
          return next;
        });
        consecutiveKai.current += 1;
        maybeScheduleFollowup();
      } catch {
        // swallow — proactivity is best-effort
      } finally {
        busyRef.current = false;
      }
    },
    []
  );

  // After Kai speaks, sometimes (chance-based) tack on a continuous follow-up.
  function maybeScheduleFollowup() {
    if (!getProactiveChat()) return;
    if (consecutiveKai.current >= PROACTIVE.maxConsecutive) return;
    if (Math.random() > PROACTIVE.followupChance) return;
    const delay =
      PROACTIVE.followupDelayMin +
      Math.random() * (PROACTIVE.followupDelayMax - PROACTIVE.followupDelayMin);
    if (followupTimer.current) clearTimeout(followupTimer.current);
    followupTimer.current = setTimeout(() => {
      void sendProactive("followup");
    }, delay);
  }

  // When the user goes quiet, Kai may open a fresh thread (rate-limited).
  function scheduleIdleOpener() {
    if (!getProactiveChat()) return;
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      const since = Date.now() - lastOpenerAt.current;
      if (since < PROACTIVE.openerCooldown) return;
      // Only sometimes — most idle moments pass without Kai jumping in.
      if (Math.random() > PROACTIVE.openerChance) return;
      lastOpenerAt.current = Date.now();
      consecutiveKai.current = 0;
      void sendProactive("opener");
    }, PROACTIVE.idleBeforeOpener);
  }

  // Arm the idle opener once on mount; tear timers down on unmount.
  useEffect(() => {
    scheduleIdleOpener();
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Let the user start a quote-reply from any message.
  function startReply(m: Msg) {
    setReplyTo({ id: m.id, role: m.role, content: m.content });
  }

  if (hasKey === false) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <Kai size={72} />
        <h2 className="mt-4 font-display text-xl font-extrabold">
          Let&apos;s connect Kai&apos;s brain
        </h2>
        <p className="mt-2 max-w-xs text-sm text-muted">
          Kai needs your own Google Gemini API key to chat. It stays on this
          device, never on our servers.
        </p>
        <Link
          href="/settings"
          className="btn-pop mt-6 inline-flex h-12 items-center justify-center rounded-2xl border-indigo-deep bg-indigo-ai px-6 text-sm uppercase tracking-wide text-white"
        >
          Add your key →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* chat header */}
      <div className="flex items-center gap-3 border-b-2 border-border px-5 py-3 sm:px-8">
        <Kai size={38} />
        <div className="leading-tight">
          <p className="font-display text-sm font-extrabold">Kai</p>
          <p className="flex items-center gap-1.5 text-xs text-mint">
            <span className="h-2 w-2 rounded-full bg-mint" />
            online · talks N5
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <ModelSwitcher key={modelTick} />
          <ChatMenu
            messages={messages.map((m) => ({ role: m.role, content: m.content }))}
            onCleared={() => {
              setMessages([]);
              setHasMore(false);
              try {
                localStorage.removeItem(CACHE_KEY);
              } catch {}
            }}
            onCompacted={loadLatest}
          />
        </div>
      </div>

      {/* stream */}
      <div
        ref={streamRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-indigo-ai/[0.03] to-transparent px-4 py-5 sm:px-8"
      >
        <div className="mx-auto flex max-w-2xl flex-col gap-1">
          {loadingOlder && (
            <p className="py-2 text-center text-xs font-semibold text-muted">
              Loading earlier messages…
            </p>
          )}
          {messages.length === 0 && (
            <div className="flex flex-col items-center py-10 text-center">
              <Kai size={56} />
              <p className="mt-3 font-jp text-lg text-indigo-ai">こんにちは！</p>
              <p className="mt-1 text-sm text-muted">
                Say hi to Kai to start. Tap any of her words to see what it
                means.
              </p>
            </div>
          )}

          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const showDivider = i === 0 || prev.dayKey !== m.dayKey;
            // Group consecutive messages from the same sender (show avatar only
            // on the first of a run, like iMessage/WhatsApp).
            const startGroup =
              showDivider || !prev || prev.role !== m.role;
            return (
              <div key={m.id}>
                {showDivider && (
                  <div className="my-4 flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs font-bold text-muted">
                      {dayLabel(m.dayKey, todayKey)}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                )}
                <MessageBubble
                  msg={m}
                  startGroup={startGroup}
                  savedWords={savedWords}
                  openToken={openToken}
                  onToggleToken={(key) =>
                    setOpenToken((cur) => (cur === key ? null : key))
                  }
                  onSaved={(w) =>
                    setSavedWords((s) => new Set(s).add(w))
                  }
                  onReply={() => startReply(m)}
                />
              </div>
            );
          })}

          {sending && (
            <div className="mt-1 flex items-end gap-2">
              <Kai size={28} className="mb-1 shrink-0" />
              <div className="flex gap-1 rounded-2xl rounded-bl-md bg-card px-4 py-3.5 shadow-sm">
                <Dot d="0ms" /> <Dot d="150ms" /> <Dot d="300ms" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* composer */}
      <div className="border-t-2 border-border px-4 py-3 sm:px-8">
        <div className="mx-auto max-w-2xl">
          {notice && (
            <p className="mb-2 text-center text-xs font-semibold text-indigo-ai">
              {notice}
            </p>
          )}
          {error && (
            <p className="mb-2 text-center text-xs font-semibold text-sakura">
              {error}
            </p>
          )}
          {replyTo && (
            <div className="mb-2 flex items-center gap-2 rounded-2xl border-2 border-border bg-indigo-ai/5 px-3 py-2">
              <span className="text-sm">↩︎</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-indigo-ai">
                  Replying to {replyTo.role === "kai" ? "Kai" : "you"}
                </p>
                <p className="truncate text-xs text-muted">{replyTo.content}</p>
              </div>
              <button
                onClick={() => setReplyTo(null)}
                className="text-muted/60 hover:text-sakura"
                aria-label="Cancel reply"
              >
                ✕
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 rounded-full border-2 border-border bg-card px-4 py-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Say something to Kai…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted/60"
            />
            <span
              className={`text-xs tabular-nums ${over ? "font-bold text-sakura" : "text-muted/60"}`}
            >
              {len}/{MAX_MESSAGE_CHARS}
            </span>
            <button
              onClick={send}
              disabled={sending || over || !input.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-ai text-white transition-colors hover:bg-indigo-soft disabled:opacity-40"
              aria-label="Send"
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const JP_CHAR = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;

/** Whether a space should sit between two rendered tokens.
 *  Japanese has no spaces; English does. Skip spaces around Japanese tokens and
 *  before closing/sentence punctuation or after opening punctuation. */
function spaceBetween(prev: string | undefined, curr: string): boolean {
  if (!prev) return false;
  if (JP_CHAR.test(prev) || JP_CHAR.test(curr)) return false;
  if (/^[!?.,)\]}」』）、。…:;%]/.test(curr)) return false;
  if (/[([{「『（]$/.test(prev)) return false;
  return true;
}

function QuotedSnippet({ quote }: { quote: NonNullable<QuoteRef> }) {
  return (
    <div className="mb-1 border-l-2 border-current/30 pl-2 text-xs opacity-70">
      <span className="font-bold">
        {quote.role === "kai" ? "Kai" : "You"}
      </span>
      <span className="ml-1 line-clamp-2 break-words">{quote.content}</span>
    </div>
  );
}

function ReplyButton({ onReply }: { onReply: () => void }) {
  return (
    <button
      onClick={onReply}
      className="opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
      aria-label="Reply to this message"
      title="Reply"
    >
      <span className="text-xs text-muted hover:text-indigo-ai">↩︎</span>
    </button>
  );
}

function MessageBubble({
  msg,
  startGroup,
  savedWords,
  openToken,
  onToggleToken,
  onSaved,
  onReply,
}: {
  msg: Msg;
  startGroup: boolean;
  savedWords: Set<string>;
  openToken: string | null;
  onToggleToken: (key: string) => void;
  onSaved: (w: string) => void;
  onReply: () => void;
}) {
  if (msg.role === "user") {
    return (
      <div
        className={`group flex items-center justify-end gap-2 ${startGroup ? "mt-3" : "mt-0.5"}`}
      >
        <ReplyButton onReply={onReply} />
        <div className="max-w-[80%] rounded-3xl rounded-br-md bg-indigo-ai px-4 py-2.5 text-white shadow-sm">
          {msg.replyTo && <QuotedSnippet quote={msg.replyTo} />}
          <p className="font-jp leading-relaxed">{msg.content}</p>
        </div>
      </div>
    );
  }

  let tokens: CachedToken[] | null = null;
  if (msg.tokens) {
    try {
      tokens = JSON.parse(msg.tokens);
    } catch {
      tokens = null;
    }
  }

  return (
    <div className={`group flex items-end gap-2 ${startGroup ? "mt-3" : "mt-0.5"}`}>
      {/* avatar slot — only on the first message of a run */}
      <div className="w-7 shrink-0">
        {startGroup && <Kai size={28} className="mb-1" />}
      </div>
      <div className="max-w-[82%]">
        {startGroup && (
          <p className="mb-0.5 ml-1 text-xs font-bold text-muted">Kai</p>
        )}
        <div
          className={`rounded-3xl bg-card px-4 py-2.5 shadow-sm ${
            startGroup ? "rounded-bl-md" : "rounded-bl-3xl"
          }`}
        >
          {msg.replyTo && <QuotedSnippet quote={msg.replyTo} />}
          {msg.proactive && (
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-indigo-ai/60">
              ✨ Kai reached out
            </p>
          )}
          <p className="font-jp text-lg leading-loose">
            {tokens ? (
              tokens.map((t, i) => {
                const key = `${msg.id}-${i}`;
                return (
                  <span key={i}>
                    {spaceBetween(tokens![i - 1]?.surface, t.surface) ? " " : ""}
                    <WordToken
                      token={t}
                      sourceMessageId={msg.id}
                      savedWords={savedWords}
                      onSaved={onSaved}
                      isOpen={openToken === key}
                      onToggle={() => onToggleToken(key)}
                    />
                  </span>
                );
              })
            ) : (
              <span>{msg.content}</span>
            )}
          </p>
          {msg.english && <EnglishToggle text={msg.english} />}
        </div>
      </div>
      <ReplyButton onReply={onReply} />
    </div>
  );
}

function EnglishToggle({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="mt-1.5 border-t border-border/60 pt-1.5">
      {show ? (
        <p className="text-sm text-muted">{text}</p>
      ) : (
        <button
          onClick={() => setShow(true)}
          className="text-xs font-bold text-indigo-ai/70 transition-colors hover:text-indigo-ai"
        >
          Show English
        </button>
      )}
    </div>
  );
}

function Dot({ d }: { d: string }) {
  return (
    <span
      className="h-2 w-2 animate-bounce rounded-full bg-indigo-ai/50"
      style={{ animationDelay: d }}
    />
  );
}
