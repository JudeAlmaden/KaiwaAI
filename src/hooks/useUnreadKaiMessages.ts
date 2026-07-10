import { useEffect, useState } from "react";
import { isUnread, cacheKeys, readCache } from "@/lib/chat-cache";

type Conversation = {
  id: string;
  kind: string;
  name: string;
  lastAt?: string;
  lastMessage?: {
    fromMe: boolean;
  };
};

/**
 * Hook that checks if there are unread messages from Kai.
 * Returns true if the Kai conversation exists and has unread messages.
 */
export function useUnreadKaiMessages(): boolean {
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    const checkUnread = () => {
      if (typeof window === "undefined") return;

      // Read conversations from cache
      const convos = readCache<Conversation[]>(cacheKeys.convos);
      if (!convos || !Array.isArray(convos)) {
        setHasUnread(false);
        return;
      }

      // Find Kai's conversation (persona kind, name "Kai")
      const kaiConvo = convos.find(
        (c) => c.kind === "persona" && c.name === "Kai"
      );

      if (!kaiConvo) {
        setHasUnread(false);
        return;
      }

      // Check if it has unread messages
      const unread = isUnread(
        kaiConvo.id,
        kaiConvo.lastAt,
        kaiConvo.lastMessage?.fromMe ?? false
      );

      setHasUnread(unread);
    };

    // Check immediately
    checkUnread();

    // Listen for storage changes (when messages are sent/received)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === cacheKeys.convos || e.key === cacheKeys.seen) {
        checkUnread();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Poll every 30 seconds to catch updates in the same tab
    const interval = setInterval(checkUnread, 30000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return hasUnread;
}
