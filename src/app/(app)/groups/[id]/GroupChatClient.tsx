"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { charLength, MAX_MESSAGE_CHARS } from "@/lib/types";
import { chatWithPersona, proactiveKaiMessage, type PromptContext } from "@/lib/gemini";
import { hasAnyKey } from "@/lib/api-keys";
import { getAutoMemory } from "@/lib/model-config";
import { getProactiveChat, PROACTIVE } from "@/lib/proactive-config";
import { checkJapaneseGrammar, hasJapanese } from "@/lib/grammar-check";
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
import {
  loadQuestForConv,
  updateQuestState,
  clearQuestForConv,
  buildQuestSystemPromptSuffix,
  extractQuestCompletions,
  type ActiveQuestState,
} from "@/lib/quests";

type GMsg = {
  id: string;
  senderName: string;
  senderKind: string;
  content: string;
  english?: string | null;
  tokens?: string | null;
  correction?: string | null;
  userCorrection?: string | null; // AI correction for user's Japanese
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
  const [quotedMessage, setQuotedMessage] = useState<GMsg | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [questState, setQuestState] = useState<ActiveQuestState | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const didInitialScroll = useRef(false);
  const loadingOlderRef = useRef(false);
  const atBottomRef = useRef(true);
  // Proactivity bookkeeping (1:1 persona chats only).
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const followupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastOpenerAt = useRef(0);
  const consecutiveAi = useRef(0);
  const busyRef = useRef(false);
  const messagesRef = useRef<GMsg[]>([]);
  const pollingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    endRef.current?.scrollIntoView({ behavior });
    setAtBottom(true);
    atBottomRef.current = true;
    setUnreadCount(0);
  }

  const cacheKey = cacheKeys.conv(groupId);

  // Load quest state for this conversation (if a quest was started)
  useEffect(() => {
    const state = loadQuestForConv(groupId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state) setQuestState(state);
  }, [groupId]);

  // Poll for new messages every 3 seconds for user-to-user chats
  const pollForNewMessages = useCallback(() => {
    if (pollingTimer.current) clearTimeout(pollingTimer.current);
    
    // Only poll for non-persona chats or group chats (where other users might message)
    if (!group || group.kind === "persona") return;
    
    const poll = async () => {
      try {
        const lastMsg = messagesRef.current[messagesRef.current.length - 1];
        if (!lastMsg || lastMsg.id.startsWith("tmp-")) return;
        
        const res = await fetch(
          `/api/groups/${groupId}?after=${encodeURIComponent(lastMsg.id)}`
        );
        if (!res.ok) return;
        
        const d = await res.json();
        const newMsgs: GMsg[] = d.messages ?? [];
        
        if (newMsgs.length > 0) {
          setMessages((m) => {
            const seen = new Set(m.map((x) => x.id));
            const toAdd = newMsgs.filter((x) => !seen.has(x.id));
            if (!atBottomRef.current) {
              setUnreadCount((c) => c + toAdd.length);
            }
            return [...m, ...toAdd];
          });
        }
      } catch {
        // Polling is best-effort, ignore errors
      } finally {
        pollingTimer.current = setTimeout(poll, 3000); // Poll every 3 seconds
      }
    };
    
    pollingTimer.current = setTimeout(poll, 3000);
  }, [groupId, group]);


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
      if (messages.length > 0) {
        didInitialScroll.current = true;
        atBottomRef.current = true;
        setTimeout(() => setAtBottom(true), 0);
      }
    } else if (atBottomRef.current) {
      // Only auto-scroll if we're already at the bottom
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

  // Start polling when group loads
  useEffect(() => {
    if (group && group.kind !== "persona") {
      pollForNewMessages();
    }
    return () => {
      if (pollingTimer.current) clearTimeout(pollingTimer.current);
    };
  }, [group, pollForNewMessages]);

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
        // Only send last 12 messages for context
        const history = messagesRef.current.slice(-12).map((m) => ({
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
    if (!atBottomRef.current) return;
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
    return () => {
      clearProactiveTimers();
      if (pollingTimer.current) clearTimeout(pollingTimer.current);
    };
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
    const quotedMsg = quotedMessage;
    setQuotedMessage(null); // Clear quote after sending
    // The user spoke — cancel any pending proactive timers and reset counters.
    clearProactiveTimers();
    consecutiveAi.current = 0;
    busyRef.current = true;

    // Check grammar for Japanese messages (client-side, BYOK)
    let userCorrection = null;
    if (hasJapanese(content) && hasAnyKey()) {
      try {
        console.log("Checking grammar for:", content);
        const correction = await checkJapaneseGrammar(content);
        console.log("Grammar check result:", correction);
        if (correction.status !== "none" && correction.status !== "correct") {
          userCorrection = correction;
          console.log("Grammar correction applied:", userCorrection);
        } else {
          console.log("No correction needed, status:", correction.status);
        }
      } catch (err) {
        console.warn("Grammar check failed:", err);
        // Continue sending even if grammar check fails
      }
    } else {
      console.log("Skipping grammar check - hasJapanese:", hasJapanese(content), "hasKey:", hasAnyKey());
    }

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
        userCorrection: userCorrection ? JSON.stringify(userCorrection) : null,
        isMe: true,
        createdAt: new Date().toISOString(),
      };
      setMessages((m) => [...m, optimistic]);

      try {
        const ctx = await buildCtx(persona!.id);
        // Only send last 12 messages for context (not the entire conversation)
        const history = messages.slice(-12).map((m) => ({
          role: (m.senderKind === "persona" ? "model" : "user") as
            | "user"
            | "model",
          content: m.content,
        }));
        // Build persona personality, injecting quest system prompt if active
        const basePersonality = persona!.personality!;
        const questSuffix =
          questState && !questState.completed
            ? buildQuestSystemPromptSuffix(questState.quest)
            : "";
        const kai = await chatWithPersona(
          content,
          ctx,
          basePersonality + questSuffix,
          history
        );
          // Extract and strip [OBJECTIVE_COMPLETED:id] tags from reply
          const { cleanReply, completedIds } = extractQuestCompletions(kai.reply);
          if (completedIds.length > 0 && questState) {
            const allCompleted = [
              ...questState.completedObjectiveIds,
              ...completedIds.filter((id) => !questState.completedObjectiveIds.includes(id)),
            ];
            const isNowDone = allCompleted.length >= questState.quest.objectives.length;
            const next: ActiveQuestState = {
              ...questState,
              completedObjectiveIds: allCompleted,
              completed: isNowDone,
            };
            updateQuestState(groupId, next);
            setQuestState(next);
          }
          // If quest cleaned the reply, store the cleaned version for display
          const displayReply = completedIds.length > 0 ? cleanReply : kai.reply;

          const res = await fetch(`/api/groups/${groupId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            quotedMessageId: quotedMsg?.id,
            userCorrection: userCorrection ? JSON.stringify(userCorrection) : undefined,
            aiReply: {
              reply: displayReply,
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
        body: JSON.stringify({ 
          content, 
          quotedMessageId: quotedMsg?.id,
          userCorrection: userCorrection ? JSON.stringify(userCorrection) : undefined,
        }),
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
    if (group?.isOwner) {
      // Owner: actually delete the conversation for everyone
      const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
      if (res.ok) {
        clearConversationCache(groupId);
        router.push("/chat");
      }
    } else {
      // Non-owner: just hide it from their list
      const res = await fetch(`/api/groups/${groupId}/hide`, { method: "POST" });
      if (res.ok) {
        dropFromConvosCache(groupId);
        router.push("/chat");
      }
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
        {group?.clientGenerated && <ModelSwitcher />}
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

      {/* Quest objectives panel */}
      {questState && !questState.completed && (
        <div className="border-b-2 border-indigo-ai/20 bg-indigo-ai/5 px-5 py-3 sm:px-8">
          <div className="mx-auto max-w-2xl">
            <div className="flex items-center justify-between">
              <p className="text-xs font-extrabold text-indigo-ai">
                {questState.quest.emoji} {questState.quest.title}
              </p>
              <span className="text-xs text-muted">
                {questState.completedObjectiveIds.length} / {questState.quest.objectives.length}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {questState.quest.objectives.map((obj) => {
                const done = questState.completedObjectiveIds.includes(obj.id);
                return (
                  <div
                    key={obj.id}
                    title={done ? obj.description : `Hint: ${obj.jpHint}`}
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
                      done
                        ? "bg-mint/20 text-mint line-through opacity-60"
                        : "bg-indigo-ai/10 text-indigo-ai"
                    }`}
                  >
                    <span>{done ? "✅" : "⬜"}</span>
                    <span>{obj.description}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Quest completion overlay */}
      {questState?.completed && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-bg/90 backdrop-blur-sm">
          <div className="mx-4 max-w-sm rounded-3xl border-2 border-indigo-ai/30 bg-card p-8 text-center shadow-xl">
            <div className="text-5xl">🎉</div>
            <h2 className="mt-4 font-display text-2xl font-extrabold">Quest Complete!</h2>
            <p className="mt-2 text-sm text-muted">
              <span className="font-jp">{questState.quest.jpTitle}</span>
            </p>
            <p className="mt-1 text-xs text-muted">
              You completed all {questState.quest.objectives.length} objectives.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={() => {
                  clearQuestForConv(groupId);
                  setQuestState(null);
                }}
                className="rounded-full border-2 border-border px-5 py-2 text-sm font-bold text-muted transition-colors hover:border-indigo-ai hover:text-indigo-ai"
              >
                Keep chatting
              </button>
              <button
                onClick={() => {
                  clearQuestForConv(groupId);
                  router.push("/chat?tab=ai");
                }}
                className="btn-pop rounded-full bg-indigo-ai px-5 py-2 text-sm font-bold text-white"
              >
                Back to Quests
              </button>
            </div>
          </div>
        </div>
      )}

      {/* stream */}
      <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollTop < 80) loadOlder();
          const near = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
          atBottomRef.current = near;
          setAtBottom(near);
          if (near) setUnreadCount(0);
        }}
        className="h-full overflow-y-auto px-4 py-5 sm:px-8"
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
                  onReply={() => setQuotedMessage(m)}
                />
              </div>
            );
          })}
          {sending && (
            <div className="mt-2 flex items-end gap-2">
              {group?.persona && (
                <Avatar name={group.persona.name} emoji={group.persona.avatar} size={28} />
              )}
              <div className="flex flex-col items-start gap-0.5">
                {group?.persona && (
                  <span className="ml-1 text-[10px] font-bold text-indigo-ai/70">
                    {group.persona.name} is typing…
                  </span>
                )}
                <div className="flex gap-1.5 rounded-3xl rounded-bl-md border-2 border-border bg-card px-4 py-3 shadow-sm">
                  <Dot d="0ms" />
                  <Dot d="160ms" />
                  <Dot d="320ms" />
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Scroll-to-bottom FAB */}
      {!atBottom && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 rounded-full bg-indigo-ai px-3 py-2 text-xs font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
          aria-label="Scroll to latest"
        >
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-sakura px-1 text-[10px]">
              {unreadCount}
            </span>
          )}
          <span>↓ Latest</span>
        </button>
      )}
      </div>

      {/* composer */}
      <div className="border-t-2 border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-8">
        <div className="mx-auto max-w-2xl">
          {error && (
            <p className="mb-2 text-center text-xs font-semibold text-sakura">
              {error}
            </p>
          )}
          {quotedMessage && (
            <div className="mb-2 flex items-start gap-2 overflow-hidden rounded-2xl border-2 border-l-4 border-indigo-ai/20 border-l-indigo-ai bg-indigo-ai/5 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-extrabold ${
                  quotedMessage.senderKind === "persona" ? "text-indigo-ai" : "text-muted"
                }`}>
                  ↩ {quotedMessage.senderName}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {quotedMessage.content}
                </p>
              </div>
              <button
                onClick={() => setQuotedMessage(null)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted hover:bg-border hover:text-foreground"
              >
                ✕
              </button>
            </div>
          )}
          {memSuggestions.length > 0 && group?.persona && (
            <MemorySuggestions
              suggestions={memSuggestions}
              personaId={group.persona.id}
              auto={getAutoMemory()}
              onClear={() => setMemSuggestions([])}
            />
          )}
          <div className="flex items-center gap-2 rounded-full border-2 border-border bg-card px-4 py-2 focus-within:border-indigo-ai/60 transition-colors">
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
            {/* Character counter: hidden until 80% full */}
            {len > MAX_MESSAGE_CHARS * 0.8 && (
              <span
                className={`text-xs tabular-nums font-semibold transition-colors ${
                  over ? "text-sakura font-bold" : len > MAX_MESSAGE_CHARS * 0.9 ? "text-amber" : "text-muted/60"
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
  onReply,
}: {
  msg: GMsg;
  startGroup: boolean;
  endGroup: boolean;
  onReply: () => void;
}) {
  const [showReply, setShowReply] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isPersona = msg.senderKind === "persona";
  const time = timeLabel(new Date(msg.createdAt));

  // Parse user correction if available
  let userCorrection = null;
  if (msg.userCorrection) {
    try {
      userCorrection = JSON.parse(msg.userCorrection);
    } catch {
      // ignore invalid JSON
    }
  }

  // Handle touch events for swipe gesture
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const deltaX = touchX - touchStartX.current;
    const deltaY = touchY - touchStartY.current;

    // Only swipe horizontally if more horizontal than vertical movement
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      e.preventDefault();
      // Determine swipe direction based on message position
      const correctDirection = msg.isMe ? deltaX < 0 : deltaX > 0;
      if (correctDirection) {
        const offset = Math.min(Math.abs(deltaX), 80);
        setSwipeOffset(msg.isMe ? -offset : offset);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    // If swiped enough (more than 50px), trigger reply
    if (Math.abs(swipeOffset) > 50) {
      onReply();
    }
    // Animate back to original position
    setTimeout(() => setSwipeOffset(0), 100);
  };

  if (msg.isMe) {
    return (
      <div
        className={`group flex items-center justify-end gap-2 ${startGroup ? "mt-3" : "mt-0.5"}`}
        onMouseEnter={() => setShowReply(true)}
        onMouseLeave={() => setShowReply(false)}
      >
        {/* Reply button on the side - vertically centered, visible during swipe */}
        <button
          onClick={onReply}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-ai/10 text-indigo-ai transition-all hover:bg-indigo-ai hover:text-white ${
            showReply || Math.abs(swipeOffset) > 20 ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"
          }`}
          title="Reply"
        >
          ↩
        </button>
        <div
          className="flex max-w-[80%] flex-col items-end touch-pan-y"
          style={{ 
            transform: `translateX(${swipeOffset}px)`,
            transition: isSwiping ? 'none' : 'transform 0.2s ease-out'
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className={`rounded-3xl bg-indigo-ai px-4 py-2.5 text-white shadow-sm ${
              endGroup ? "rounded-br-md" : ""
            }`}
          >
            <p className="font-jp leading-relaxed">{msg.content}</p>
          </div>
          {endGroup && (
            <span className="mr-1 mt-0.5 text-[10px] text-muted/60">{time}</span>
          )}
          {/* Grammar correction for user's message */}
          {userCorrection && userCorrection.status !== "correct" && userCorrection.status !== "none" && (
            <div className="mt-2 max-w-full rounded-2xl border-2 border-amber/30 bg-amber/5 px-3 py-2 text-left">
              <div className="flex items-start gap-2">
                <span className="text-sm">✏️</span>
                <div className="min-w-0 flex-1 text-xs">
                  {userCorrection.corrected && (
                    <p className="mb-1">
                      <span className="font-jp text-sakura line-through">{msg.content}</span>
                      {" → "}
                      <span className="font-jp font-bold text-mint">{userCorrection.corrected}</span>
                    </p>
                  )}
                  {userCorrection.explanation && (
                    <p className="text-muted">{userCorrection.explanation}</p>
                  )}
                  {userCorrection.natural && userCorrection.natural !== userCorrection.corrected && (
                    <p className="mt-1">
                      <span className="text-muted/70">More natural: </span>
                      <span className="font-jp font-semibold text-foreground">{userCorrection.natural}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-2 ${startGroup ? "mt-3" : "mt-0.5"}`}
      onMouseEnter={() => setShowReply(true)}
      onMouseLeave={() => setShowReply(false)}
    >
      {/* avatar slot — rendered only on the last bubble of a run */}
      <div className="w-7 shrink-0">
        {endGroup && <Avatar name={msg.senderName} emoji={undefined} size={28} />}
      </div>
      <div
        className="flex min-w-0 max-w-[82%] flex-col items-start touch-pan-y"
        style={{ 
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
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
      {/* Reply button on the side - vertically centered, visible during swipe */}
      <button
        onClick={onReply}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-ai/10 text-indigo-ai transition-all hover:bg-indigo-ai hover:text-white ${
          showReply || Math.abs(swipeOffset) > 20 ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"
        }`}
        title="Reply"
      >
        ↩
      </button>
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
