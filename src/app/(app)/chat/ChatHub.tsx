"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PencilSimple, Users } from "@phosphor-icons/react/dist/ssr";
import PageHeader from "../PageHeader";
import InboxList from "./InboxList";
import ComposeSheet, { type ComposeMode } from "./ComposeSheet";
import StrangerQueueModal from "./strangers/StrangerQueueModal";
import { useInbox } from "./useInbox";
import { isUnread } from "@/lib/chat-cache";

/**
 * Phone hub (`/chat`). On desktop the inbox lives in the rail
 * (`(inbox)/layout.tsx`), so this page only renders the empty right-hand pane.
 */
export default function ChatHub({
  strangerEnabled = false,
}: {
  strangerEnabled?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    convos,
    personas,
    pending,
    starting,
    hideConvo,
    startPersonaChat,
  } = useInbox();

  // The tab bar is gone; `?compose=` opens a specific intent, and `?tab=ai|meet`
  // keeps pre-reset links working for one release.
  const tabParam = searchParams.get("tab");
  const legacyCompose: ComposeMode | null =
    tabParam === "ai" || tabParam === "meet" ? tabParam : null;
  const composeParam = searchParams.get("compose") ?? legacyCompose;
  const wantsQuests = composeParam === "quest";
  const composeIntent: ComposeMode | null = wantsQuests
    ? "ai"
    : composeParam === "ai" ||
        composeParam === "friend" ||
        composeParam === "group" ||
        (composeParam === "meet" && strangerEnabled)
      ? composeParam
      : null;

  const [composeOpen, setComposeOpen] = useState(
    () => composeIntent !== null && searchParams.get("queue") !== "1"
  );
  const [composeMode, setComposeMode] = useState<ComposeMode>(
    composeIntent ?? "ai"
  );
  const [query, setQuery] = useState("");
  // A room's "Next" hands over `?queue=1`, so the dialog opens on arrival
  // instead of flashing the inbox for a frame.
  const [queueOpen, setQueueOpen] = useState(
    () => strangerEnabled && searchParams.get("queue") === "1"
  );

  // Drop the handover params once they have opened their dialog, so a refresh
  // never re-queues or reopens the sheet.
  useEffect(() => {
    const hasCompose =
      searchParams.has("compose") || tabParam === "ai" || tabParam === "meet";
    if (!searchParams.has("queue") && !hasCompose) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("queue");
    params.delete("compose");
    if (params.get("tab") === "ai" || params.get("tab") === "meet") {
      params.delete("tab");
    }
    const qs = params.toString();
    router.replace(qs ? `/chat?${qs}` : "/chat", { scroll: false });
  }, [searchParams, router, tabParam]);

  // The Friends tab is gone; keep its old links working.
  useEffect(() => {
    if (tabParam === "friends") router.replace("/friends");
  }, [tabParam, router]);

  const unreadCount = useMemo(() => {
    if (!convos) return 0;
    return convos.filter((c) =>
      isUnread(c.id, c.lastAt, c.lastMessage?.fromMe ?? false)
    ).length;
  }, [convos]);

  const subtitle = useMemo(() => {
    if (unreadCount > 0) {
      return `You have ${unreadCount} unread conversation${unreadCount === 1 ? "" : "s"}`;
    }
    if (convos?.length === 0) return "Start your first conversation with Kai";
    return "Talk to AI personas, friends, and groups";
  }, [unreadCount, convos]);

  const openCompose = (mode: ComposeMode) => {
    setComposeMode(mode);
    setComposeOpen(true);
  };

  return (
    <>
      <div className="flex h-full min-h-0 flex-col lg:hidden">
        <PageHeader
          title="Chat"
          jp="会話"
          subtitle={subtitle}
          compact
          action={
            <div className="flex items-center gap-2">
              <Link
                href="/friends"
                className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-border text-muted transition-colors hover:border-indigo-ai hover:text-indigo-ai"
                aria-label="Friends"
                title="Friends"
              >
                <Users size={18} weight="bold" />
              </Link>
              <button
                onClick={() => openCompose("ai")}
                className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-border text-muted transition-colors hover:border-indigo-ai hover:text-indigo-ai"
                aria-label="New chat"
                title="New chat"
              >
                <PencilSimple size={18} weight="bold" />
              </button>
            </div>
          }
        />

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] sm:px-8 sm:py-5 sm:pb-5">
          <div className="mx-auto w-full max-w-2xl">
            <InboxList
              convos={convos}
              personas={personas}
              pending={pending}
              starting={starting}
              query={query}
              onQuery={setQuery}
              onStartPersona={startPersonaChat}
              onHide={hideConvo}
              onCompose={openCompose}
              strangerEnabled={strangerEnabled}
            />
          </div>
        </div>

        {/* One compose action for the whole hub; the island nav stays put. */}
        <button
          onClick={() => openCompose("ai")}
          aria-label="New chat"
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-ai text-white shadow-xl shadow-indigo-ai/35 ring-4 ring-bg transition-transform active:scale-95"
        >
          <PencilSimple size={22} weight="bold" />
        </button>
      </div>

      {/* Desktop: the rail holds the inbox, so `/chat` itself is the empty pane. */}
      <div className="hidden h-full flex-1 flex-col items-center justify-center px-8 text-center lg:flex">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-ai/10 text-3xl ring-2 ring-indigo-ai/20">
          💬
        </span>
        <p className="mt-4 font-display text-lg font-extrabold">No chat selected</p>
        <p className="mt-1 max-w-xs text-sm text-muted">
          Pick a conversation on the left, or start a new one.
        </p>
        <button
          onClick={() => openCompose("ai")}
          className="mt-5 min-h-11 rounded-full bg-indigo-ai px-5 font-display text-sm font-bold text-white shadow-md shadow-indigo-ai/25 transition-colors hover:bg-indigo-deep"
        >
          New chat
        </button>
      </div>

      {composeOpen && (
        <ComposeSheet
          mode={composeMode}
          onModeChange={setComposeMode}
          onClose={() => setComposeOpen(false)}
          onCreated={(id) => {
            setComposeOpen(false);
            router.push(`/chat/c/${id}`);
          }}
          onMeet={() => {
            setComposeOpen(false);
            setQueueOpen(true);
          }}
          onQuest={(groupId) => {
            setComposeOpen(false);
            router.push(`/chat/c/${groupId}`);
          }}
          strangerEnabled={strangerEnabled}
          initialQuestsOpen={wantsQuests}
        />
      )}

      {strangerEnabled && queueOpen && (
        <StrangerQueueModal onClose={() => setQueueOpen(false)} />
      )}
    </>
  );
}
