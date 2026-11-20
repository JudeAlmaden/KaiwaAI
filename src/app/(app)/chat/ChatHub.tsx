"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PencilSimple, Users } from "@phosphor-icons/react/dist/ssr";
import PageHeader from "../PageHeader";
import InboxList from "./InboxList";
import PeopleSheet, { type PeopleFocus } from "./PeopleSheet";
import NewChatSheet, { type ComposeMode } from "./NewChatSheet";
import RequestsRow from "./RequestsRow";
import MeetRow from "./MeetRow";
import QueueRow from "./QueueRow";
import {
  useInboxContext,
  useMatchQueueContext,
  usePeopleContext,
} from "./InboxProvider";
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
  const { convos, personas, starting, hideConvo, startPersonaChat } =
    useInboxContext();
  const { pending } = usePeopleContext();
  const { start: startMatching } = useMatchQueueContext();

  // `?compose=` and `?tab=` keep old links working for one release; `?panel=`
  // opens People. Everything else resolves to the two sheets or the queue row.
  const tabParam = searchParams.get("tab");
  const legacyCompose = tabParam === "ai" || tabParam === "meet" ? tabParam : null;
  const composeParam = searchParams.get("compose") ?? legacyCompose;
  const wantsQuests = composeParam === "quest";

  const [people, setPeople] = useState<{ focus?: PeopleFocus } | null>(() => {
    const panel = searchParams.get("panel");
    if (panel === "requests") return { focus: "requests" };
    if (panel === "personas") return { focus: "personas" };
    if (panel === "people" || tabParam === "friends") return {};
    return null;
  });
  const [write, setWrite] = useState<{
    mode: ComposeMode;
    focusSearch?: boolean;
    quests?: boolean;
  } | null>(() => {
    if (searchParams.get("queue") === "1" || composeParam === "meet") return null;
    if (composeParam === "group") return { mode: "group" };
    if (composeParam === "ai" || composeParam === "friend" || wantsQuests) {
      return {
        mode: "people",
        focusSearch: composeParam === "friend",
        quests: wantsQuests,
      };
    }
    return null;
  });
  const [query, setQuery] = useState("");

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

  // The sidebar's Meet action, old stranger links and `?compose=meet` all start
  // matching; the row above the list then owns cancel/retry.
  useEffect(() => {
    if (!strangerEnabled) return;
    const wants =
      searchParams.get("queue") === "1" || searchParams.get("compose") === "meet";
    if (!wants) return;
    void startMatching();
  }, [searchParams, strangerEnabled, startMatching]);

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

  const openWrite = () => setWrite({ mode: "people", focusSearch: true });

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
              <button
                onClick={() => setPeople({})}
                className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-border text-muted transition-colors hover:border-indigo-ai hover:text-indigo-ai"
                aria-label="People"
                title="People"
              >
                <Users size={18} weight="bold" />
                {pending > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sakura px-1 text-[9px] font-bold text-white ring-2 ring-card">
                    {pending}
                  </span>
                )}
              </button>
              <button
                onClick={openWrite}
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
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
            <RequestsRow onOpen={() => setPeople({ focus: "requests" })} />
            <QueueRow />
            <InboxList
              convos={convos}
              personas={personas}
              starting={starting}
              query={query}
              onQuery={setQuery}
              onStartPersona={startPersonaChat}
              onHide={hideConvo}
              onNewChat={openWrite}
            />
            <MeetRow strangerEnabled={strangerEnabled} />
          </div>
        </div>

        {/* One compose action for the whole hub; the island nav stays put. */}
        <button
          onClick={openWrite}
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
        <p className="mt-4 font-display text-lg font-extrabold">No chats selected</p>
        <p className="mt-1 max-w-xs text-sm text-muted">
          Pick a conversation on the left, or start a new one.
        </p>
        <button
          onClick={openWrite}
          className="mt-5 min-h-11 rounded-full bg-indigo-ai px-5 font-display text-sm font-bold text-white shadow-md shadow-indigo-ai/25 transition-colors hover:bg-indigo-deep"
        >
          New chat
        </button>
      </div>

      {people && (
        <PeopleSheet focus={people.focus} onClose={() => setPeople(null)} />
      )}

      {write && (
        <NewChatSheet
          initialMode={write.mode}
          focusSearch={write.focusSearch}
          initialQuestsOpen={write.quests}
          onClose={() => setWrite(null)}
        />
      )}
    </>
  );
}
