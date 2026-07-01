"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { charLength, MAX_MESSAGE_CHARS } from "@/lib/types";
import { chatWithPersona, proactiveKaiMessage, type PromptContext } from "@/lib/gemini";
import { hasAnyKey } from "@/lib/api-keys";
import { getAutoMemory } from "@/lib/model-config";
import { getProactiveChat, PROACTIVE } from "@/lib/proactive-config";
import { RichKaiText } from "../../chat/RichText";
import Avatar from "../../chat/Avatar";
import ModelSwitcher from "../../chat/ModelSwitcher";
import MemorySuggestions from "../../chat/MemorySuggestions";
import GroupKeyDialog from "./GroupKeyDialog";
import ConvMenu from "./ConvMenu";
import {
  cacheKeys,
  readCache,
  writeCache,
  clearConversationCache,
  dropFromConvosCache,
  markConversationSeen,
} from "@/lib/chat-cache";

type GMsg = {
  id: string;
  senderName: string;
  senderKind: string;
  content: string;
  english?: string | null;
  tokens?: string | null;
  correction?: string | null;
  isMe: boolean;
  createdAt: string;
};

type Member = {
  kind: string;
  name?: string | null;
  avatar?: string | null;
  isMe?: boolean;
};

type PersonaInfo = {
  id: string;
  name: string;
  avatar: string;
  personality: string | null;
};

type GroupInfo = {
  id: string;
  name: string;
  kind: string;
  isOwner: boolean;
  hasKey: boolean;
  clientGenerated: boolean;
  persona: PersonaInfo | null;
  members: Member[];
};

export default function GroupChatClient({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [messages, setMessages] = useState<GMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [hasKey, setHasKey] = useState(true);
  const [memSuggestions, setMemSuggestions] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const didInitialScroll = useRef(false);
  const loadingOlderRef = useRef(false);
  // Proactivity bookkeeping (1:1 persona chats only).
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const followupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastOpenerAt = useRef(0);
  const consecutiveAi = useRef(0);
  const busyRef = useRef(false);
  const messagesRef = useRef<GMsg[]>([]);

  const cacheKey = cacheKeys.conv(groupId);

  const load = useCallback(() => {
    fetch(`/api/groups/${groupId}`)
      .then(async (r) => {
        if (r.status === 403 || r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        setGroup(d.group);
        const msgs: GMsg[] = d.messages ?? [];
        setMessages(msgs);
        setHasMore(Boolean(d.hasMore));
        writeCache(cacheKey, { group: d.group, messages: msgs.slice(-50) });
      })
      .catch(() => {});
  }, [groupId, cacheKey]);

  // Fetch the next older page (cursor = oldest loaded message) and prepend it,
  // preserving the user's scroll position so the view doesn't jump.
  const loadOlder = useCallback(() => {
    if (loadingOlderRef.current || !hasMore) return;
    const oldest = messagesRef.current.find((m) => !m.id.startsWith("tmp-"));
    if (!oldest) return;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    fetch(`/api/groups/${groupId}?before=${encodeURIComponent(oldest.id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        const older: GMsg[] = d.messages ?? [];
        setHasMore(Boolean(d.hasMore));
        if (older.length === 0) return;
        setMessages((cur) => {
          const seen = new Set(cur.map((m) => m.id));
          return [...older.filter((m) => !seen.has(m.id)), ...cur];
        });
        // After the prepend paints, restore scroll so content stays put.
        requestAnimationFrame(() => {
          if (el) el.scrollTop = el.scrollHeight - prevHeight;
        });
      })
      .catch(() => {})
      .finally(() => {
        loadingOlderRef.current = false;
        setLoadingOlder(false);
      });
  }, [groupId, hasMore]);

  useEffect(() => {
    // Paint the cached conversation instantly, then refresh from the server.
    const cached = readCache<{ group: GroupInfo; messages: GMsg[] }>(cacheKey);
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (cached.group) setGroup(cached.group);
      if (Array.isArray(cached.messages)) setMessages(cached.messages);
    }
    load();
    setHasKey(hasAnyKey());
  }, [load, cacheKey]);

  useEffect(() => {
    // Don't yank to the bottom while we're prepending older history.
    if (loadingOlderRef.current) return;
    if (!didInitialScroll.current) {
      // First paint: jump straight to the latest message (no travel animation).
      endRef.current?.scrollIntoView();
      if (messages.length > 0) didInitialScroll.current = true;
    } else {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Keep the local cache fresh as messages change (skips optimistic temp rows).
  useEffect(() => {
    if (!group) return;
    const persistable = messages.filter((m) => !m.id.startsWith("tmp-"));
    writeCache(cacheKey, { group, messages: persistable.slice(-50) });
    messagesRef.current = messages;
    // Viewing the conversation marks everything in it as seen.
    const last = persistable[persistable.length - 1];
    markConversationSeen(groupId, last?.createdAt);
  }, [messages, group, cacheKey, groupId]);

  // ── In-chat proactivity: persona messages first while you're online ──
  // Only for 1:1 persona conversations (BYOK, client-generated).
  const canBeProactive = () =>
    group?.kind === "persona" &&
    !!group.persona?.personality &&
    getProactiveChat() &&
    hasAnyKey();

  function clearProactiveTimers() {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (followupTimer.current) clearTimeout(followupTimer.current);
    idleTimer.current = null;
    followupTimer.current = null;
  }

  const fireProactive = useCallback(
    async (kind: "opener" | "followup") => {
      if (busyRef.current || !canBeProactive()) return;
      if (document.hidden) return;
      if (consecutiveAi.current >= PROACTIVE.maxConsecutive) return;
      const persona = group!.persona!;
      busyRef.current = true;
      try {
        const ctx = await buildCtx(persona.id);
        const history = messagesRef.current.map((m) => ({
          role: (m.senderKind === "persona" ? "model" : "user") as
            | "user"
            | "model",
          content: m.content,
        }));
        const kai = await proactiveKaiMessage(ctx, { kind }, history);
        if (!kai.reply) return;
        const res = await fetch(`/api/groups/${groupId}/proactive`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reply: kai.reply,
            english: kai.english,
            tokens: kai.tokens,
            correction: kai.correction,
          }),
        });
        const d = await res.json().catch(() => ({}));
        if (res.ok && d.message) {
          stickToBottomProactive();
          setMessages((m) => [...m, d.message]);
          consecutiveAi.current += 1;
          maybeScheduleFollowup();
        }
      } catch {
        // proactivity is best-effort; never surface errors
      } finally {
        busyRef.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [group, groupId]
  );

  function stickToBottomProactive() {
    requestAnimationFrame(() =>
      endRef.current?.scrollIntoView({ behavior: "smooth" })
    );
  }

  function maybeScheduleFollowup() {
    if (!canBeProactive()) return;
    if (consecutiveAi.current >= PROACTIVE.maxConsecutive) return;
    if (Math.random() > PROACTIVE.followupChance) return;
    const delay =
      PROACTIVE.followupDelayMin +
      Math.random() * (PROACTIVE.followupDelayMax - PROACTIVE.followupDelayMin);
    if (followupTimer.current) clearTimeout(followupTimer.current);
    followupTimer.current = setTimeout(() => void fireProactive("followup"), delay);
  }

  const scheduleIdleOpener = useCallback(() => {
    if (!canBeProactive()) return;
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      if (Date.now() - lastOpenerAt.current < PROACTIVE.openerCooldown) return;
      if (Math.random() > PROACTIVE.openerChance) return;
      lastOpenerAt.current = Date.now();
      consecutiveAi.current = 0;
      void fireProactive("opener");
    }, PROACTIVE.idleBeforeOpener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fireProactive, group]);

  // Arm the idle opener once the conversation (with a persona) is loaded.
  useEffect(() => {
    if (group?.kind === "persona") scheduleIdleOpener();
    return () => clearProactiveTimers();
  }, [group?.id, group?.kind, scheduleIdleOpener]);

  const len = charLength(input);
  const over = len > MAX_MESSAGE_CHARS;

  // Build a PromptContext for client-side persona generation, pulling the
  // persona's own memory from the server (scoped per persona).
  async function buildCtx(personaId: string): Promise<PromptContext> {
    try {
      const res = await fetch(`/api/chat/context?personaId=${encodeURIComponent(personaId)}`);
      if (res.ok) return (await res.json()) as PromptContext;
    } catch {}
    return {
      level: "N5",
      reinforce: [],
      newWordBudget: 2,
      knownCount: 0,
      memories: [],
      recentTurns: [],
    };
  }

  function mentionsPersona(message: string, personaName: string): boolean {
    if (!personaName) return false;
    const name = personaName.toLowerCase();
    const compact = name.replace(/\s+/g, "");
    const tokens = message.toLowerCase().match(/@([\p{L}\p{N}_]+)/gu);
    if (!tokens) return false;
    return tokens.some((t) => {
      const h = t.slice(1);
      return h === name || h === compact || (name.startsWith(h) && h.length >= 2);
    });
  }

  async function send() {
    const content = input.trim();
    if (!content || over || sending) return;
    setSending(true);
    setError(null);
    setInput("");
    // The user spoke — cancel any pending proactive timers and reset counters.
    clearProactiveTimers();
    consecutiveAi.current = 0;
    busyRef.current = true;

    // When the AI should reply: 1:1 persona chats always; group chats only when
    // the persona is @mentioned. Generation is client-side (BYOK).
    const persona = group?.persona;
    const wantsAi =
      !!persona?.personality &&
      group?.clientGenerated &&
      (group.kind === "persona" || mentionsPersona(content, persona.name));

    if (wantsAi) {
      if (!hasAnyKey()) {
        setHasKey(false);
        setError("Add your Gemini API key in Settings to chat with this persona.");
        setInput(content);
        setSending(false);
        return;
      }
      const optimistic: GMsg = {
        id: `tmp-${Date.now()}`,
        senderName: "You",
        senderKind: "user",
        content,
        isMe: true,
        createdAt: new Date().toISOString(),
      };
      setMessages((m) => [...m, optimistic]);

      try {
        const ctx = await buildCtx(persona!.id);
        const history = messages.map((m) => ({
          role: (m.senderKind === "persona" ? "model" : "user") as
            | "user"
            | "model",
          content: m.content,
        }));
        const kai = await chatWithPersona(
          content,
          ctx,
          persona!.personality!,
          history
        );
        const res = await fetch(`/api/groups/${groupId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            aiReply: {
              reply: kai.reply,
              english: kai.english,
              tokens: kai.tokens,
              correction: kai.correction,
            },
          }),
        });
        const d = await res.json();
        if (!res.ok) {
          setError(d.error ?? "Couldn't send.");
        } else {
          setMessages((m) => [
            ...m.filter((x) => x.id !== optimistic.id),
            ...(d.messages ?? []),
          ]);
          // Surface durable facts the persona noticed, scoped to this persona.
          const sugg = kai.memorySuggestions ?? [];
          if (sugg.length > 0) {
            if (getAutoMemory()) {
              for (const s of sugg) {
                await fetch("/api/memory", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    content: s,
                    personaId: persona!.id,
                    category: "fact",
                  }),
                }).catch(() => {});
              }
            }
          setMemSuggestions(sugg);
          }
          // Kai answered once; maybe a spontaneous follow-up, then re-arm idle.
          consecutiveAi.current = 1;
          maybeScheduleFollowup();
        }
      } catch (e) {
        setMessages((m) => m.filter((x) => x.id !== optimistic.id));
        setInput(content);
        const msg = e instanceof Error ? e.message : "Something went wrong.";
        if (msg === "NO_API_KEY") {
          setHasKey(false);
          setError("Add your Gemini API key in Settings to chat with this persona.");
        } else if (msg === "BAD_API_KEY")
          setError("That Gemini key was rejected. Check it in Settings.");
        else if (msg === "RATE_LIMIT")
          setError("Gemini's rate limit hit. Wait a moment and try again.");
        else setError(msg);
      } finally {
        setSending(false);
        busyRef.current = false;
        scheduleIdleOpener();
      }
      return;
    }

    // Otherwise (plain human message — DM, or group without @mention) just save.
    try {
      const res = await fetch(`/api/groups/${groupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "Couldn't send.");
        setInput(content);
      } else {
        setMessages((m) => [...m, ...(d.messages ?? [])]);
      }
    } catch {
      setError("Something went wrong.");
      setInput(content);
    } finally {
      setSending(false);
      busyRef.current = false;
      scheduleIdleOpener();
    }
  }

  async function deleteGroup() {
    if (!group?.isOwner) return;
    const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
    if (res.ok) {
      // Remove its transcript cache AND drop it from the conversation list so
      // it doesn't flash back before the hub refetches.
      clearConversationCache(groupId);
      router.push("/chat");
    }
  }

  async function clearMessages() {
    const res = await fetch(`/api/groups/${groupId}/messages`, {
      method: "DELETE",
    });
    if (res.ok) {
      setMessages([]);
      // Keep the conversation, but persist the now-empty transcript and refresh
      // its preview in the list cache.
      if (group) writeCache(cacheKey, { group, messages: [] });
      dropFromConvosCache(groupId);
    }
  }

  if (notFound) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="font-display text-lg font-bold">Conversation not available</p>
        <Link href="/chat" className="mt-3 text-sm font-bold text-indigo-ai">
          ← Back to chat
        </Link>
      </div>
    );
  }

  const personaCount = group?.members.filter((m) => m.kind === "persona").length ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* header */}
      <div className="flex items-center gap-3 border-b-2 border-border px-5 py-3 sm:px-8">
        <Link href="/chat" className="text-muted hover:text-indigo-ai">
          ←
        </Link>
        {group?.persona ? (
          <Avatar name={group.persona.name} emoji={group.persona.avatar} size={36} />
        ) : group?.kind === "group" ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-ai/10 text-lg">
            👥
          </span>
        ) : (
          <Avatar name={group?.name} size={36} />
        )}
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate font-display text-sm font-extrabold">
            {group?.name ?? "…"}
          </p>
          <p className="truncate text-xs text-muted">
            {group?.members.map((m) => (m.kind === "persona" ? m.name : m.name)).join(", ")}
          </p>
        </div>
        {group?.clientGenerated && (
          <div className="hidden sm:block">
            <ModelSwitcher />
          </div>
        )}
        {group?.isOwner && !group.clientGenerated && personaCount > 0 && (
          <button
            onClick={() => setShowKey(true)}
            className="rounded-full border-2 border-border px-3 py-1 text-xs font-bold text-muted hover:border-indigo-ai hover:text-indigo-ai"
          >
            {group.hasKey ? "API key ✓" : "Set API key"}
          </button>
        )}
        {group && (
          <ConvMenu
            isOwner={group.isOwner}
            personaId={group.persona?.id ?? null}
            onClear={clearMessages}
            onDelete={deleteGroup}
          />
        )}
      </div>

      {/* owner-needs-key hint (server-key group chats only) */}
      {group?.isOwner && !group.clientGenerated && !group.hasKey && personaCount > 0 && (
        <p className="bg-amber/10 px-5 py-2 text-xs font-semibold text-amber sm:px-8">
          Add your Gemini API key so the AI personas can reply.
        </p>
      )}

      {/* BYOK hint for solo persona chats */}
      {group?.clientGenerated && !hasKey && (
        <p className="bg-amber/10 px-5 py-2 text-xs font-semibold text-amber sm:px-8">
          Add your Gemini API key in{" "}
          <Link href="/settings" className="underline">
            Settings
          </Link>{" "}
          to chat with this persona.
        </p>
      )}

      {/* stream */}
      <div
        ref={scrollRef}
        onScroll={(e) => {
          if (e.currentTarget.scrollTop < 80) loadOlder();
        }}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8"
      >
        <div className="mx-auto flex max-w-2xl flex-col">
          {loadingOlder && (
            <p className="py-2 text-center text-xs text-muted">Loading earlier messages…</p>
          )}
          {messages.length === 0 && (
            <p className="py-10 text-center text-sm text-muted">
              Say hi to start the conversation.
            </p>
          )}
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const next = messages[i + 1];
            // Group consecutive messages from the same sender (Messenger-style).
            const sameAsPrev =
              !!prev && prev.senderKind === m.senderKind && prev.isMe === m.isMe;
            const sameAsNext =
              !!next && next.senderKind === m.senderKind && next.isMe === m.isMe;
            // Show a divider when a message starts a new day, or after a long
            // gap (>1h) from the previous one — separating chat sessions.
            const divider = sessionDivider(prev?.createdAt, m.createdAt);
            return (
              <div key={m.id}>
                {divider && (
                  <div className="my-4 flex items-center gap-3">
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-[11px] font-bold uppercase tracking-wide text-muted/70">
                      {divider}
                    </span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                )}
                <GroupBubble
                  msg={m}
                  startGroup={!sameAsPrev || !!divider}
                  endGroup={!sameAsNext}
                />
              </div>
            );
          })}
          {sending && (
            <div className="mt-1 flex items-end gap-2">
              {group?.persona && (
                <Avatar name={group.persona.name} emoji={group.persona.avatar} size={28} />
              )}
              <div className="flex gap-1 rounded-3xl rounded-bl-md bg-card px-4 py-3.5 shadow-sm">
                <Dot d="0ms" /> <Dot d="150ms" /> <Dot d="300ms" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* composer */}
      <div className="border-t-2 border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-8">
        <div className="mx-auto max-w-2xl">
          {error && (
            <p className="mb-2 text-center text-xs font-semibold text-sakura">
              {error}
            </p>
          )}
          {memSuggestions.length > 0 && group?.persona && (
            <MemorySuggestions
              suggestions={memSuggestions}
              personaId={group.persona.id}
              auto={getAutoMemory()}
              onClear={() => setMemSuggestions([])}
            />
          )}
          <div className="flex items-center gap-2 rounded-full border-2 border-border bg-card px-4 py-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={
                group?.kind === "group" && group.persona
                  ? `Message… (@${group.persona.name} to summon)`
                  : "Message…"
              }
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
              className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-ai text-white disabled:opacity-40"
              aria-label="Send"
            >
              ↑
            </button>
          </div>
        </div>
      </div>

      {showKey && group && (
        <GroupKeyDialog
          groupId={groupId}
          hasKey={group.hasKey}
          onClose={() => setShowKey(false)}
          onSaved={() => {
            setShowKey(false);
            load();
          }}
        />
      )}
    </div>
  );
}

/** Divider label between chat sessions: new day, or a gap over an hour. */
function sessionDivider(prevIso: string | undefined, iso: string): string | null {
  const cur = new Date(iso);
  if (Number.isNaN(cur.getTime())) return null;
  if (!prevIso) return dayLabel(cur);
  const prev = new Date(prevIso);
  const sameDay = prev.toDateString() === cur.toDateString();
  const gapMs = cur.getTime() - prev.getTime();
  if (!sameDay) return dayLabel(cur);
  if (gapMs > 60 * 60 * 1000) return timeLabel(cur); // >1h gap = new session
  return null;
}

function dayLabel(d: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

function timeLabel(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function GroupBubble({
  msg,
  startGroup,
  endGroup,
}: {
  msg: GMsg;
  startGroup: boolean;
  endGroup: boolean;
}) {
  const isPersona = msg.senderKind === "persona";
  const time = timeLabel(new Date(msg.createdAt));

  if (msg.isMe) {
    return (
      <div
        className={`group flex justify-end ${startGroup ? "mt-3" : "mt-0.5"}`}
      >
        <div className="flex max-w-[80%] flex-col items-end">
          <div
            className={`rounded-3xl bg-indigo-ai px-4 py-2.5 text-white shadow-sm ${
              endGroup ? "rounded-br-md" : ""
            }`}
          >
            <p className="leading-relaxed">{msg.content}</p>
          </div>
          {endGroup && (
            <span className="mr-1 mt-0.5 text-[10px] text-muted/60">{time}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-end gap-2 ${startGroup ? "mt-3" : "mt-0.5"}`}>
      {/* avatar slot — rendered only on the last bubble of a run */}
      <div className="w-7 shrink-0">
        {endGroup && <Avatar name={msg.senderName} emoji={undefined} size={28} />}
      </div>
      <div className="flex min-w-0 max-w-[82%] flex-col items-start">
        {startGroup && (
          <span
            className={`mb-0.5 ml-1 text-xs font-bold ${isPersona ? "text-indigo-ai" : "text-muted"}`}
          >
            {msg.senderName}
          </span>
        )}
        <div
          className={`max-w-full rounded-3xl bg-card px-4 py-2.5 shadow-sm ${
            endGroup ? "rounded-bl-md" : ""
          }`}
        >
          {isPersona ? (
            <RichKaiText
              content={msg.content}
              tokensJson={msg.tokens}
              english={msg.english}
              correctionJson={msg.correction}
              messageId={msg.id}
            />
          ) : (
            <p className="font-jp leading-relaxed">{msg.content}</p>
          )}
        </div>
        {endGroup && (
          <span className="ml-1 mt-0.5 text-[10px] text-muted/60">{time}</span>
        )}
      </div>
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
