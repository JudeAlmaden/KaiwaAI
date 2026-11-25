"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { PencilSimple, Users } from "@phosphor-icons/react/dist/ssr";
import InboxList, { InboxSearchRow } from "./InboxList";
import PeopleSheet, { type PeopleFocus } from "./PeopleSheet";
import NewChatSheet, { type ComposeMode } from "./NewChatSheet";
import RequestsRow from "./RequestsRow";
import MeetRow from "./MeetRow";
import QueueRow from "./QueueRow";
import { useInboxContext, usePeopleContext } from "./InboxProvider";

/**
 * Desktop left rail: a conversation list with a header. The people icon manages
 * contacts and personas; the pencil writes (message, request, group). Neither
 * mixes with the other.
 */
export default function ChatRail({
  strangerEnabled = false,
}: {
  strangerEnabled?: boolean;
}) {
  const pathname = usePathname();
  const {
    convos,
    hiddenConvos,
    personas,
    starting,
    hideConvo,
    unhideConvo,
    deleteConvo,
    startPersonaChat,
  } = useInboxContext();
  const { pending } = usePeopleContext();

  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<{ focus?: PeopleFocus } | null>(null);
  const [write, setWrite] = useState<{
    mode: ComposeMode;
    focusSearch?: boolean;
  } | null>(null);

  const activeId = pathname.startsWith("/chat/c/")
    ? pathname.split("/")[3]
    : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b-2 border-border px-4 py-3">
        <h1 className="font-display text-lg font-extrabold">Chats</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPeople({})}
            aria-label="People"
            title="People"
            className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-border text-muted transition-colors hover:border-indigo-ai hover:text-indigo-ai"
          >
            <Users size={18} weight="bold" />
            {pending > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sakura px-1 text-[9px] font-bold text-white ring-2 ring-card">
                {pending}
              </span>
            )}
          </button>
          <button
            onClick={() => setWrite({ mode: "people", focusSearch: true })}
            aria-label="New chat"
            title="New chat"
            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-border text-muted transition-colors hover:border-indigo-ai hover:text-indigo-ai"
          >
            <PencilSimple size={18} weight="bold" />
          </button>
        </div>
      </div>

      <div className="border-b-2 border-border px-3 py-2">
        <InboxSearchRow
          query={query}
          onQuery={setQuery}
          onNewChat={() => setWrite({ mode: "people", focusSearch: true })}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="flex flex-col gap-3">
          <RequestsRow onOpen={() => setPeople({ focus: "requests" })} />
          <QueueRow />
          <InboxList
            convos={convos}
            personas={personas}
            starting={starting}
            query={query}
            onStartPersona={startPersonaChat}
            onHide={hideConvo}
            onUnhide={unhideConvo}
            onDelete={deleteConvo}
            hiddenConvos={hiddenConvos}
            onNewChat={() => setWrite({ mode: "people", focusSearch: true })}
            activeId={activeId}
          />
          <MeetRow strangerEnabled={strangerEnabled} />
        </div>
      </div>

      {people && (
        <PeopleSheet focus={people.focus} onClose={() => setPeople(null)} />
      )}

      {write && (
        <NewChatSheet
          initialMode={write.mode}
          focusSearch={write.focusSearch}
          onClose={() => setWrite(null)}
        />
      )}
    </div>
  );
}
