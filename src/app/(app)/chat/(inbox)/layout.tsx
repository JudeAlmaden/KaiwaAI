import { isStrangerChatEnabled } from "@/lib/stranger/config";
import ChatRail from "../ChatRail";
import { InboxProvider } from "../InboxProvider";

// Messenger-style split: a fixed rail with the inbox, friends and matching on
// `lg+`, and the selected conversation in the pane. Phones hide the rail and each
// route fills the screen as before. One provider wraps both so the queue keeps
// running while you move between conversations.
export default function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const strangerEnabled = isStrangerChatEnabled();

  return (
    <InboxProvider strangerEnabled={strangerEnabled}>
      <div className="flex h-full min-h-0">
        <aside className="hidden w-[360px] shrink-0 flex-col border-r-2 border-border/70 lg:flex">
          <ChatRail strangerEnabled={strangerEnabled} />
        </aside>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </InboxProvider>
  );
}
