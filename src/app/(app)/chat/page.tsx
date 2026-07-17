import ChatHub from "./ChatHub";

// Unified chat hub: your conversations (Kai, personas, friend DMs, groups) plus
// quick ways to start new ones. Individual conversations open at /chat/c/[id]
// (and Kai's dedicated rich chat at /chat/kai).
export default function ChatPage() {
  return <ChatHub />;
}
