"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, PencilSimple, Sparkle } from "@phosphor-icons/react/dist/ssr";
import FriendsPanel from "../groups/FriendsPanel";
import PersonaManager from "./PersonaManager";
import NewChat from "./NewChat";
import Avatar from "./Avatar";
import { cacheKeys, readCache, writeCache, isUnread } from "@/lib/chat-cache";

type Conversation = {
  id: string;
  name: string;
  kind: string; // persona | dm | group
  isOwner: boolean;
  hasKey: boolean;
  lastMessage: { content: string; senderName: string; fromMe?: boolean } | null;
  lastAt?: string;
  members: { kind: string; name?: string | null; avatar?: string | null }[];
};

type Persona = {
  id: string;
  name: string;
  blurb: string;
  avatar: string;
  builtin: boolean;
  mine: boolean;
};

export default function ChatHub() {
  const router = useRouter();
  const [convos, setConvos] = useState<Conversation[] | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [tab, setTab] = useState<"chats" | "ai" | "friends">("chats");
  const [composing, setComposing] = useState(false);
  const [pending, setPending] = useState(0);
  const [starting, setStarting] = useState(false);
  const [query, setQuery] = useState("");

  const loadConvos = useCallback(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((d) => {
        const list: Conversation[] = d.groups ?? [];
        setConvos(list);
        writeCache(cacheKeys.convos, list);
      })
      .catch(() => setConvos((c) => c ?? []));
  }, []);

  const loadPersonas = useCallback(() => {
    fetch("/api/personas")
      .then((r) => r.json())
      .then((d) => {
        const list: Persona[] = d.personas ?? [];
        setPersonas(list);
        writeCache(cacheKeys.personas, list);
      })
      .catch(() => {});
  }, []);

  const loadPending = useCallback(() => {
    Promise.all([
      fetch("/api/friends").then((r) => r.json()).catch(() => ({})),
      fetch("/api/invites").then((r) => r.json()).catch(() => ({})),
    ]).then(([f, i]) => {
      setPending((f.incoming?.length ?? 0) + (i.invites?.length ?? 0));
    });
  }, []);

  useEffect(() => {
    // Paint cached conversations + personas instantly, then refresh.
    const cachedC = readCache<Conversation[]>(cacheKeys.convos);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (cachedC) setConvos(cachedC);
    const cachedP = readCache<Persona[]>(cacheKeys.personas);
    if (cachedP) setPersonas(cachedP);
    loadConvos();
    loadPersonas();
    loadPending();
  }, [loadConvos, loadPersonas, loadPending]);

  // Open (or create+open) a 1:1 persona conversation.
  async function startPersonaChat(personaId: string) {
    if (starting) return;
    setStarting(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.group?.id) router.push(`/chat/c/${d.group.id}`);
    } catch {
      // ignore
    } finally {
      setStarting(false);
    }
  }

  const tabs: { id: typeof tab; label: string }[] = [
    { id: "chats", label: "Chats" },
    { id: "ai", label: "AI" },
    { id: "friends", label: "Friends" },
  ];

  // Quick-action suggestion chips shown at the top of the chat list (mobile-first UX)
  const SUGGESTIONS = [
    { label: "✨ New AI chat", action: () => setTab("ai") },
    { label: "💬 New chat", action: () => setComposing(true) },
    { label: "👥 Find friends", action: () => setTab("friends") },
  ];

  const filteredConvos = useMemo(() => {
    if (!convos) return null;
    const q = query.trim().toLowerCase();
    if (!q) return convos;
    return convos.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.lastMessage?.content ?? "").toLowerCase().includes(q)
    );
  }, [convos, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
              tab === t.id
                ? "bg-indigo-ai text-white shadow-sm"
                : "text-muted hover:bg-indigo-ai/10"
            }`}
          >
            {t.label}
            {t.id === "friends" && pending > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-sakura px-1 text-[10px] font-bold text-white">
                {pending}
              </span>
            )}
          </button>
        ))}

        {tab === "chats" && (
          <button
            onClick={() => setComposing(true)}
            className="btn-pop ml-auto flex items-center gap-1.5 rounded-full bg-indigo-ai px-4 py-2 text-sm font-bold text-white"
          >
            <PencilSimple size={16} weight="bold" />
            New chat
          </button>
        )}
      </div>

      {tab === "chats" && (
        <div className="flex flex-col gap-3">
          {/* Mobile suggestion chips — visible only when there are convos */}
          {convos !== null && convos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 sm:hidden" style={{ scrollbarWidth: "none" }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={s.action}
                  className="shrink-0 rounded-full border-2 border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-indigo-ai hover:text-indigo-ai active:scale-95"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
          {/* search */}
          {convos && convos.length > 4 && (
            <div className="flex items-center gap-2 rounded-full border-2 border-border bg-card px-4 py-2">
              <MagnifyingGlass size={16} className="text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted/60"
              />
            </div>
          )}

          {convos === null && (
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-2xl border-2 border-border px-4 py-3"
                >
                  <span className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-border/50" />
                  <span className="flex-1 space-y-2">
                    <span className="block h-3 w-1/3 animate-pulse rounded bg-border/50" />
                    <span className="block h-2.5 w-2/3 animate-pulse rounded bg-border/40" />
                  </span>
                </div>
              ))}
            </div>
          )}

          {convos?.length === 0 && (
            <div className="rounded-3xl border-2 border-dashed border-border px-6 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-ai/10">
                <Sparkle size={26} weight="duotone" className="text-indigo-ai" />
              </div>
              <p className="mt-3 font-display font-bold">No conversations yet</p>
              <p className="mt-1 text-sm text-muted">
                Start chatting with an AI tutor, a friend, or a group.
              </p>
              <button
                onClick={() => setComposing(true)}
                className="btn-pop mt-4 rounded-full bg-indigo-ai px-5 py-2 text-sm font-bold text-white"
              >
                Start a chat
              </button>
            </div>
          )}

          {filteredConvos?.map((c) => (
            <ConversationRow 
              key={c.id} 
              convo={c} 
              onHide={(id) => {
                // Optimistically remove from list
                setConvos((convos) => convos?.filter((conv) => conv.id !== id) ?? null);
                // Hide on server
                fetch(`/api/groups/${id}/hide`, { method: "POST" }).catch(() => {
                  // If failed, reload to restore
                  loadConvos();
                });
              }}
            />
          ))}

          {filteredConvos?.length === 0 && convos && convos.length > 0 && (
            <p className="py-6 text-center text-sm text-muted">
              No conversations match &ldquo;{query}&rdquo;.
            </p>
          )}
        </div>
      )}

      {tab === "ai" && (
        <PersonaManager
          personas={personas}
          onChange={loadPersonas}
          onStartChat={startPersonaChat}
        />
      )}

      {tab === "friends" && <FriendsPanel />}

      {composing && (
        <NewChat
          onClose={() => setComposing(false)}
          onCreated={(id) => {
            setComposing(false);
            router.push(`/chat/c/${id}`);
          }}
        />
      )}
    </div>
  );
}

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.floor((Date.now() - then) / 1000);
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return `${Math.floor(d / 7)}w`;
}

function ConversationRow({
  convo,
  onHide,
}: {
  convo: {
    id: string;
    name: string;
    kind: string;
    lastMessage: { content: string; senderName: string; fromMe?: boolean } | null;
    lastAt?: string;
    members: { kind: string; name?: string | null; avatar?: string | null }[];
  };
  onHide: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const personaMember = convo.members.find((m) => m.kind === "persona");
  const isAi = convo.kind === "persona";
  const isGroup = convo.kind === "group";
  const unread = isUnread(convo.id, convo.lastAt, convo.lastMessage?.fromMe ?? false);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [menuOpen]);

  const handleHide = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    onHide(convo.id);
  };

  const avatar = isGroup ? (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-ai/20 to-sakura/20 text-2xl">
      👥
    </span>
  ) : isAi && personaMember ? (
    <Avatar name={personaMember.name} emoji={personaMember.avatar} size={48} />
  ) : (
    <Avatar name={convo.name} size={48} />
  );

  const preview = convo.lastMessage
    ? convo.kind === "dm" || convo.kind === "persona"
      ? convo.lastMessage.content
      : `${convo.lastMessage.senderName}: ${convo.lastMessage.content}`
    : "Tap to start chatting";
  const time = relativeTime(convo.lastAt);

  return (
    <Link 
      href={`/chat/c/${convo.id}`} 
      className="group relative flex items-center gap-3 rounded-2xl border-2 border-border bg-card px-3.5 py-3 transition-all hover:-translate-y-0.5 hover:border-indigo-ai hover:shadow-md"
    >
      <div className="relative">
        {avatar}
        {isAi && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-ai text-[8px] text-white ring-2 ring-card">
            ✨
          </span>
        )}
      </div>
      
      <span className="relative min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={`truncate ${unread ? "font-extrabold" : "font-bold"}`}>
            {convo.name}
          </span>
          {isGroup && (
            <span className="rounded-full bg-indigo-ai/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-indigo-ai">
              Group
            </span>
          )}
          {time && (
            <span
              className={`ml-auto shrink-0 text-[11px] font-semibold ${
                unread ? "text-indigo-ai" : "text-muted/70"
              }`}
            >
              {time}
            </span>
          )}
        </span>
        <span className="mt-0.5 flex items-center gap-2">
          <span
            className={`min-w-0 flex-1 truncate text-xs ${
              !convo.lastMessage
                ? "italic text-muted/60"
                : unread
                  ? "font-bold text-foreground"
                  : "text-muted"
            }`}
          >
            {preview}
          </span>
          {unread && (
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-sakura" aria-label="Unread" />
          )}
        </span>
      </span>

      {/* Three-dots menu */}
      <div ref={menuRef} className="relative z-10">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-all hover:bg-indigo-ai/10 hover:text-indigo-ai sm:opacity-0 sm:group-hover:opacity-100"
          aria-label="Conversation options"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="8" cy="3" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="8" cy="13" r="1.5" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border-2 border-border bg-card p-1 shadow-xl">
            <button
              onClick={handleHide}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-sakura/5"
            >
              <span className="text-base">🗑️</span>
              <span>
                <span className="block font-bold text-sakura">Delete for me</span>
                <span className="block text-xs text-muted">Reappears if they message you</span>
              </span>
            </button>
          </div>
        )}
      </div>
    </Link>
  );
}
