import ChatHub from "../ChatHub";
import { isStrangerChatEnabled } from "@/lib/stranger/config";

// Unified chat hub: the inbox on phones, the empty right-hand pane on desktop
// (the rail in `(inbox)/layout.tsx` holds the list there). Conversations open at
// `/chat/c/[id]`, which is moved inside this group so the rail stays mounted.
export default function ChatPage() {
  return <ChatHub strangerEnabled={isStrangerChatEnabled()} />;
}
