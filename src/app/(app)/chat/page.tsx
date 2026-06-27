import { getCurrentUser } from "@/lib/auth-helpers";
import { dayKeyFor } from "@/lib/day";
import ChatClient from "./ChatClient";

export default async function ChatPage() {
  const user = await getCurrentUser();
  const todayKey = dayKeyFor(new Date(), user?.timezone ?? "UTC");
  return <ChatClient todayKey={todayKey} />;
}
