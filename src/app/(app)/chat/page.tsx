import PageHeader from "../PageHeader";
import ChatHub from "./ChatHub";

// Unified chat hub: your conversations (Kai, personas, friend DMs, groups) plus
// quick ways to start new ones. Individual conversations open at /chat/c/[id]
// (and Kai's dedicated rich chat at /chat/kai).
export default function ChatPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Chat"
        jp="会話"
        subtitle="Talk to AI personas, friends, and groups"
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8">
        <div className="mx-auto max-w-2xl">
          <ChatHub />
        </div>
      </div>
    </div>
  );
}
