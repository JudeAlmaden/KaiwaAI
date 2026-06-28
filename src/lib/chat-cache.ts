// Centralized localStorage cache keys + helpers for the chat surface.
// Keeping these in one place prevents the caches (Kai chat, conversation list,
// personas, per-conversation transcripts) from drifting out of sync after
// mutations like clear/delete/logout.

export const cacheKeys = {
  kai: "kaiwa_chat_cache",
  convos: "kaiwa_convos_cache",
  personas: "kaiwa_personas_cache",
  conv: (id: string) => `kaiwa_conv_${id}`,
  seen: "kaiwa_conv_seen", // map of conversationId -> ISO last-seen timestamp
} as const;

function safe(fn: () => void) {
  try {
    if (typeof window === "undefined") return;
    fn();
  } catch {
    // localStorage may be unavailable (private mode, quota) — ignore.
  }
}

/** Read + parse a cached JSON value, or null. */
export function readCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Write a JSON value to the cache. */
export function writeCache(key: string, value: unknown) {
  safe(() => localStorage.setItem(key, JSON.stringify(value)));
}

/** Remove a single cache entry. */
export function removeCache(key: string) {
  safe(() => localStorage.removeItem(key));
}

/** Drop one conversation from the cached conversation list (so a deleted or
 *  emptied convo doesn't flash back before the next refetch). */
export function dropFromConvosCache(groupId: string) {
  safe(() => {
    const raw = localStorage.getItem(cacheKeys.convos);
    if (!raw) return;
    const list = JSON.parse(raw) as { id: string }[];
    if (!Array.isArray(list)) return;
    localStorage.setItem(
      cacheKeys.convos,
      JSON.stringify(list.filter((c) => c.id !== groupId))
    );
  });
}

/** Delete-conversation cleanup: remove its transcript cache AND drop it from
 *  the conversation list cache. */
export function clearConversationCache(groupId: string) {
  removeCache(cacheKeys.conv(groupId));
  dropFromConvosCache(groupId);
}

/** Logout cleanup: wipe every chat-related cache for the previous user. */
export function clearAllChatCache() {
  safe(() => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) keys.push(k);
    }
    for (const k of keys) {
      if (
        k === cacheKeys.kai ||
        k === cacheKeys.convos ||
        k === cacheKeys.personas ||
        k === cacheKeys.seen ||
        k.startsWith("kaiwa_conv_")
      ) {
        localStorage.removeItem(k);
      }
    }
  });
}

// ── Unread tracking ──────────────────────────────────────────────────────────
// We store a map of conversationId -> ISO timestamp of the last activity the
// user has seen. A conversation is "unread" when its latest activity is newer
// than that, and the latest message wasn't sent by the user.

function readSeen(): Record<string, string> {
  return readCache<Record<string, string>>(cacheKeys.seen) ?? {};
}

/** Mark a conversation as seen up to the given time (defaults to now). */
export function markConversationSeen(groupId: string, at?: string) {
  const seen = readSeen();
  seen[groupId] = at ?? new Date().toISOString();
  writeCache(cacheKeys.seen, seen);
}

/** Whether a conversation has activity the user hasn't seen yet. */
export function isUnread(
  groupId: string,
  lastAt: string | undefined,
  lastFromMe: boolean
): boolean {
  if (!lastAt || lastFromMe) return false;
  const seen = readSeen()[groupId];
  if (!seen) return true; // never opened, but has a message
  return new Date(lastAt).getTime() > new Date(seen).getTime();
}
