"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PencilSimple, Users } from "@phosphor-icons/react/dist/ssr";
import InboxList from "./InboxList";
import ComposeSheet, { type ComposeMode } from "./ComposeSheet";
import StrangerQueueModal from "./strangers/StrangerQueueModal";
import RailFriendsSection from "./RailFriendsSection";
import RailMeetSection from "./RailMeetSection";
import { useInbox } from "./useInbox";

type Section = "chats" | "friends" | "meet";

/**
 * Desktop left rail: search, conversations, friends and stranger matching in one
 * column, with the selected conversation in the pane beside it. Mounted by
 * `(inbox)/layout.tsx`, so it survives navigation between chats.
 */
export default function ChatRail({
  strangerEnabled = false,
}: {
  strangerEnabled?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    convos,
    personas,
    pending,
    starting,
    hideConvo,
    startPersonaChat,
  } = useInbox();

  const [section, setSection] = useState<Section>("chats");
  const [query, setQuery] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeMode, setComposeMode] = useState<ComposeMode>("ai");
  const [queueOpen, setQueueOpen] = useState(false);

  const activeId = pathname.startsWith("/chat/c/")
    ? pathname.split("/")[3]
    : undefined;

  const openCompose = (mode: ComposeMode) => {
    setComposeMode(mode);
    setComposeOpen(true);
  };

  const sections: { id: Section; label: string; count?: number }[] = [
    { id: "chats", label: "Chats" },
    ...(pending > 0
      ? [{ id: "friends" as const, label: "Friends", count: pending }]
      : [{ id: "friends" as const, label: "Friends" }]),
    ...(strangerEnabled ? [{ id: "meet" as const, label: "Meet" }] : []),
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b-2 border-border px-4 py-3">
        <h1 className="font-display text-lg font-extrabold">Chat</h1>
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
      </div>

      <div className="flex items-center gap-1.5 border-b-2 border-border px-3 py-2">
        {sections.map((item) => (
          <button
            key={item.id}
            onClick={() => setSection(item.id)}
            className={`relative rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              section === item.id
                ? "bg-indigo-ai text-white shadow-sm"
                : "text-muted hover:bg-indigo-ai/10"
            }`}
          >
            {item.label}
            {item.count ? (
              <span className="ml-1.5 rounded-full bg-sakura px-1.5 py-0.5 text-[10px] font-bold text-white">
                {item.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {section === "chats" && (
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
            activeId={activeId}
            compact
          />
        )}

        {section === "friends" && <RailFriendsSection />}

        {section === "meet" && strangerEnabled && (
          <RailMeetSection onMeet={() => setQueueOpen(true)} />
        )}
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
        />
      )}

      {strangerEnabled && queueOpen && (
        <StrangerQueueModal onClose={() => setQueueOpen(false)} />
      )}
    </div>
  );
}
