"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowCounterClockwise,
  MagnifyingGlass,
  Trash,
} from "@phosphor-icons/react/dist/ssr";
import Avatar from "./Avatar";
import Kai from "../../Kai";
import { isUnread } from "@/lib/chat-cache";
import { MOOD_EMOJI, MOOD_LABEL, isMood } from "@/lib/mood";
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

/**
 * One inbox row. The action is a single, named control instead of an ellipsis
 * menu: swipe left on phones, hover/focus the icon on desktop. Archived rows
 * add a trash action so a chat can be removed for good, not only restored.
 */
export function ConversationRow({
  convo,
  onHide,
  onUnhide,
  onDelete,
  archived = false,
  active = false,
}: {
  convo: Conversation;
  onHide?: (id: string) => void;
  onUnhide?: (id: string) => void;
  onDelete?: (
    id: string
  ) => Promise<{ ok: boolean; error?: string }> | void;
  archived?: boolean;
  active?: boolean;
}) {
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const offsetRef = useRef(0);
  const suppressClick = useRef(false);

  const personaMember = convo.members.find((m) => m.kind === "persona");
  const isAi = convo.kind === "persona";
  const isGroup = convo.kind === "group";
  const unread = isUnread(convo.id, convo.lastAt, convo.lastMessage?.fromMe ?? false);

  // Kai is the app's companion, not an inbox item to put away: archiving that
  // thread just brings back the "start chatting" hero for the same chat. Only
  // human conversations get an archive action; Kai can be muted or deleted.
  const hasAction = archived || !isAi;
  const actionLabel = archived ? "Restore" : "Archive chat";
  const ActionIcon = archived ? ArrowCounterClockwise : Archive;

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

  function runAction() {
    if (archived) onUnhide?.(convo.id);
    else onHide?.(convo.id);
  }

  async function handleDelete() {
    if (deleting || !onDelete) return;
    const leaving = isGroup && !convo.isOwner;
    const ok = window.confirm(
      leaving
        ? "Leave this group? It disappears from your chats for good. The others keep its history."
        : "Delete this chat for you? It disappears from your chats for good and can't be restored."
    );
    if (!ok) return;
    setDeleting(true);
    try {
      const result = await onDelete(convo.id);
      if (result && !result.ok) {
        window.alert(result.error ?? "Couldn't delete this chat.");
      }
    } finally {
      setDeleting(false);
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (!hasAction) return;
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    offsetRef.current = 0;
    suppressClick.current = false;
    setSwiping(false);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!hasAction) return;
    const s = start.current;
    if (!s) return;
    const dx = e.touches[0].clientX - s.x;
    const dy = e.touches[0].clientY - s.y;
    if (!swiping) {
      // Only claim the gesture once it is clearly horizontal and leftward.
      if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      setSwiping(true);
      suppressClick.current = true;
    }
    const next = Math.max(-96, Math.min(0, dx));
    offsetRef.current = next;
    setOffset(next);
  }

  function finishSwipe() {
    if (offsetRef.current <= -56) runAction();
    offsetRef.current = 0;
    setOffset(0);
    setSwiping(false);
    start.current = null;
    if (suppressClick.current) {
      setTimeout(() => {
        suppressClick.current = false;
      }, 250);
    }
  }

  function cancelSwipe() {
    offsetRef.current = 0;
    setOffset(0);
    setSwiping(false);
    start.current = null;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Only while the row is actually sliding; behind the translucent
          selected row it used to show through as stray uppercase text. */}
      {hasAction && offset < 0 && (
        <div
          className={`pointer-events-none absolute inset-0 flex items-center justify-end rounded-2xl pr-4 text-[11px] font-extrabold uppercase tracking-wide ${
            archived ? "bg-mint/10 text-mint" : "bg-indigo-ai/10 text-indigo-ai"
          }`}
          aria-hidden="true"
        >
          <ActionIcon size={15} weight="bold" className="mr-1.5" />
          {actionLabel}
        </div>
      )}

      <Link
        href={`/chat/c/${convo.id}`}
        onClick={(e) => {
          if (!suppressClick.current) return;
          e.preventDefault();
          e.stopPropagation();
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={finishSwipe}
        onTouchCancel={cancelSwipe}
        className={`group relative flex touch-pan-y items-center gap-3 rounded-2xl border-2 px-3.5 py-3 transition-all ${
          swiping ? "transition-none" : ""
        } ${
          active
            ? "border-indigo-ai/40 bg-indigo-ai/10 pl-4"
            : "border-border bg-card hover:-translate-y-0.5 hover:border-indigo-ai hover:shadow-md"
        }`}
        style={offset !== 0 ? { transform: `translateX(${offset}px)` } : undefined}
      >
        {active && (
          <span className="absolute inset-y-2.5 left-0 w-1 rounded-r-full bg-indigo-ai" />
        )}
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

        {hasAction && (
          <span className="flex shrink-0 items-center gap-0.5">
            {archived && onDelete && (
              <button
                type="button"
                disabled={deleting}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void handleDelete();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted/50 transition-all hover:bg-sakura/10 hover:text-sakura disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                aria-label="Delete chat for me"
                title="Delete chat for me"
              >
                <Trash size={16} weight="bold" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                runAction();
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted/50 transition-all hover:bg-indigo-ai/10 hover:text-indigo-ai sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
              aria-label={actionLabel}
              title={actionLabel}
            >
              <ActionIcon size={16} weight="bold" />
            </button>
          </span>
        )}
      </Link>
    </div>
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
    (p) =>
      p.kind === "kai" || (p.builtin && p.name.trim().toLowerCase() === "kai")
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
 * Search row shared by the phone list and the rail (which pins it above the
 * scroll area so compose is always reachable).
 */
export function InboxSearchRow({
  query,
  onQuery,
  onNewChat,
}: {
  query: string;
  onQuery: (value: string) => void;
  onNewChat: () => void;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onNewChat();
      }}
      className="flex items-center gap-2 rounded-full border-2 border-border bg-card px-4 py-2"
    >
      <MagnifyingGlass size={16} className="text-muted" />
      <input
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Search conversations…"
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted/60"
      />
    </form>
  );
}

/**
 * The inbox itself: pinned Kai, search, rows and empty state. Shared by the
 * phone hub page and the desktop rail so the two can't drift. Archived chats
 * are a sibling tab rather than a section stacked above the conversations.
 */
export default function InboxList({
  convos,
  personas,
  starting,
  query,
  onStartPersona,
  onHide,
  onUnhide,
  onDelete,
  hiddenConvos,
  onNewChat,
  activeId,
}: {
  convos: Conversation[] | null;
  personas: Persona[];
  starting: boolean;
  query: string;
  onStartPersona: (personaId: string) => void;
  onHide: (id: string) => void;
  onUnhide?: (id: string) => void;
  onDelete?: (
    id: string
  ) => Promise<{ ok: boolean; error?: string }> | void;
  hiddenConvos?: Conversation[] | null;
  onNewChat: () => void;
  activeId?: string;
}) {
  const [view, setView] = useState<"chats" | "archived">("chats");
  const q = query.trim().toLowerCase();
  const matches = (c: Conversation) =>
    !q ||
    c.name.toLowerCase().includes(q) ||
    (c.lastMessage?.content ?? "").toLowerCase().includes(q);

  const filtered = convos ? convos.filter(matches) : null;
  const filteredArchived = hiddenConvos ? hiddenConvos.filter(matches) : null;

  const archivedCount = hiddenConvos?.length ?? 0;
  const archivedHasUnread = (hiddenConvos ?? []).some((c) =>
    isUnread(c.id, c.lastAt, c.lastMessage?.fromMe ?? false)
  );
  const tabsVisible = !!onUnhide && archivedCount > 0;
  const showingArchived = tabsVisible && view === "archived";

  const hasKaiThread = !!convos?.some(
    (c) => c.kind === "persona" && c.name.trim().toLowerCase() === "kai"
  );

  return (
    <div className="flex flex-col gap-3">
      {tabsVisible && (
        <div className="grid grid-cols-2 gap-1 rounded-full border-2 border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setView("chats")}
            aria-pressed={!showingArchived}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${
              !showingArchived
                ? "bg-indigo-ai text-white shadow-sm"
                : "text-muted hover:bg-indigo-ai/10 hover:text-indigo-ai"
            }`}
          >
            Chats
          </button>
          <button
            type="button"
            onClick={() => setView("archived")}
            aria-pressed={showingArchived}
            className={`relative flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${
              showingArchived
                ? "bg-indigo-ai text-white shadow-sm"
                : "text-muted hover:bg-indigo-ai/10 hover:text-indigo-ai"
            }`}
          >
            Archived
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ${
                showingArchived
                  ? "bg-white/20 text-white"
                  : "bg-muted/15 text-muted"
              }`}
            >
              {archivedCount}
            </span>
            {archivedHasUnread && (
              <span
                className="absolute right-2 top-1 h-1.5 w-1.5 rounded-full bg-sakura"
                aria-label="Unread in Archived"
              />
            )}
          </button>
        </div>
      )}

      {showingArchived ? (
        filteredArchived && filteredArchived.length > 0 ? (
          filteredArchived.map((c) => (
            <ConversationRow
              key={c.id}
              convo={c}
              archived
              onUnhide={onUnhide}
              onDelete={onDelete}
              active={activeId === c.id}
            />
          ))
        ) : (
          <p className="py-6 text-center text-sm text-muted">
            {q ? (
              <>No archived chats match &ldquo;{query}&rdquo;.</>
            ) : (
              "Nothing archived yet."
            )}
          </p>
        )
      ) : (
        <>
          {!hasKaiThread && (
            <KaiHeroCard
              onStartChat={onStartPersona}
              personas={personas}
              loading={starting}
            />
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
            <div className="rounded-2xl border-2 border-dashed border-border px-4 py-6 text-center">
              <p className="text-sm font-bold">No conversations yet</p>
              <p className="mt-0.5 text-xs text-muted">
                Start with Kai, a friend, or a group.
              </p>
              <button
                onClick={onNewChat}
                className="mt-3 rounded-full bg-indigo-ai px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-indigo-deep"
              >
                New chat
              </button>
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
        </>
      )}
    </div>
  );
}
