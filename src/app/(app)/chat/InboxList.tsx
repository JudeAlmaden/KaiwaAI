"use client";

import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import Avatar from "./Avatar";
import Kai from "../../Kai";
import { isUnread } from "@/lib/chat-cache";
import { MOOD_EMOJI, MOOD_LABEL, isMood } from "@/lib/mood";
import type { ComposeMode } from "./ComposeSheet";
import type { Conversation, Persona } from "./useInbox";

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

export function ConversationRow({
  convo,
  onHide,
  active = false,
}: {
  convo: Conversation;
  onHide: (id: string) => void;
  active?: boolean;
}) {
  const personaMember = convo.members.find((m) => m.kind === "persona");
  const isAi = convo.kind === "persona";
  const isGroup = convo.kind === "group";
  const unread = isUnread(convo.id, convo.lastAt, convo.lastMessage?.fromMe ?? false);

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
      className={`group relative flex items-center gap-3 rounded-2xl border-2 px-3.5 py-3 transition-all ${
        active
          ? "border-indigo-ai/60 bg-indigo-ai/5"
          : "border-border bg-card hover:-translate-y-0.5 hover:border-indigo-ai hover:shadow-md"
      }`}
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
          {isAi && isMood(convo.mood) && (
            <span
              className="shrink-0 text-sm leading-none"
              title={`Mood: ${MOOD_LABEL[convo.mood]}`}
              aria-label={`Mood: ${MOOD_LABEL[convo.mood]}`}
            >
              {MOOD_EMOJI[convo.mood]}
            </span>
          )}
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

      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onHide(convo.id);
        }}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-indigo-ai/10 hover:text-indigo-ai"
        aria-label="Hide conversation"
        title="Hide conversation"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>
    </Link>
  );
}

/** Hero shortcut to the Kai persona — pinned while no Kai thread exists. */
export function KaiHeroCard({
  onStartChat,
  personas,
  loading,
}: {
  onStartChat: (id: string) => void;
  personas: Persona[];
  loading: boolean;
}) {
  const kaiPersona = personas.find(
    (p) => p.builtin && p.name.trim().toLowerCase() === "kai"
  );

  if (!kaiPersona) {
    return (
      <div className="flex animate-pulse items-center gap-4 rounded-3xl border-2 border-border bg-card p-4 shadow-sm">
        <span className="h-14 w-14 shrink-0 rounded-full bg-border/50" />
        <span className="flex-1 space-y-2">
          <span className="block h-4 w-24 rounded bg-border/50" />
          <span className="block h-3 w-40 rounded bg-border/40" />
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={() => onStartChat(kaiPersona.id)}
      disabled={loading}
      className="flex w-full items-center gap-4 rounded-3xl border-2 border-indigo-ai/25 bg-gradient-to-br from-indigo-ai/8 to-sakura/5 p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-ai/50 hover:shadow-md active:scale-[0.99] disabled:opacity-70"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-ai/10 ring-2 ring-indigo-ai/20">
        <Kai size={32} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-display text-base font-extrabold text-foreground">Kai</span>
          <span className="rounded-full bg-indigo-ai/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-ai">
            AI Tutor
          </span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted">
          Your Japanese companion — tap to start chatting
        </span>
      </span>
      <span className="shrink-0 text-lg text-indigo-ai/40">›</span>
    </button>
  );
}

/**
 * The inbox itself: requests banner, pinned Kai, search, rows and empty state.
 * Shared by the phone hub page and the desktop rail so the two can't drift.
 */
export default function InboxList({
  convos,
  personas,
  pending,
  starting,
  query,
  onQuery,
  onStartPersona,
  onHide,
  onCompose,
  strangerEnabled,
  activeId,
  compact = false,
}: {
  convos: Conversation[] | null;
  personas: Persona[];
  pending: number;
  starting: boolean;
  query: string;
  onQuery: (value: string) => void;
  onStartPersona: (personaId: string) => void;
  onHide: (id: string) => void;
  onCompose: (mode: ComposeMode) => void;
  strangerEnabled: boolean;
  activeId?: string;
  compact?: boolean;
}) {
  const q = query.trim().toLowerCase();
  const filtered = convos
    ? q
      ? convos.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.lastMessage?.content ?? "").toLowerCase().includes(q)
        )
      : convos
    : null;
  const hasKaiThread = !!convos?.some(
    (c) => c.kind === "persona" && c.name.trim().toLowerCase() === "kai"
  );
  const showSearch = !!convos && convos.length > (compact ? 0 : 3);
  const chip =
    "rounded-full border-2 border-border px-3 py-1.5 text-xs font-bold text-muted transition-colors hover:border-indigo-ai hover:text-indigo-ai";

  return (
    <div className="flex flex-col gap-3">
      {pending > 0 && (
        <Link
          href="/friends"
          className="flex items-center gap-3 rounded-2xl border-2 border-sakura/30 bg-sakura/5 px-4 py-2.5 transition-colors hover:border-sakura"
        >
          <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-sakura px-1.5 text-xs font-bold text-white">
            {pending}
          </span>
          <span className="text-sm font-bold">
            {pending === 1 ? "1 request waiting" : `${pending} requests waiting`}
          </span>
          <span className="ml-auto text-indigo-ai">→</span>
        </Link>
      )}

      {!hasKaiThread && (
        <KaiHeroCard
          onStartChat={onStartPersona}
          personas={personas}
          loading={starting}
        />
      )}

      {showSearch && (
        <div className="flex items-center gap-2 rounded-full border-2 border-border bg-card px-4 py-2">
          <MagnifyingGlass size={16} className="text-muted" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
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
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onCompose("group")} className={chip}>
            Start a group
          </button>
          <Link href="/friends" className={chip}>
            Add a friend
          </Link>
          {strangerEnabled && (
            <button onClick={() => onCompose("meet")} className={chip}>
              Meet a stranger
            </button>
          )}
        </div>
      )}

      {convos && convos.length > 0 && (
        <p className="px-1 text-[10px] font-extrabold uppercase tracking-wider text-muted/70">
          Conversations
        </p>
      )}

      {filtered?.map((c) => (
        <ConversationRow
          key={c.id}
          convo={c}
          onHide={onHide}
          active={activeId === c.id}
        />
      ))}

      {filtered?.length === 0 && convos && convos.length > 0 && (
        <p className="py-6 text-center text-sm text-muted">
          No conversations match &ldquo;{query}&rdquo;.
        </p>
      )}
    </div>
  );
}
