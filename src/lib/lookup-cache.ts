/**
 * Dictionary / AI lookup results, cached in memory and across reloads.
 *
 * The same word gets looked up again every time a popup opens — including when
 * the same practice sentence comes back — so results are kept for a few hours in
 * localStorage. The store is bounded and self-pruning, and every key is scoped
 * by lookup kind, so a definition cached in review is reusable in chat.
 */

import { listStored, readStored, removeStored, writeStored } from "@/lib/local-store";

// v2: AI results are sentence-scoped (see aiLookupCacheKey), so v1 entries are
// not safe to reuse.
const STORAGE_PREFIX = "kaiwa:lookup:v2:";
/** Long enough to cover a study session plus a revisit later in the day. */
export const LOOKUP_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_ENTRIES = 200;

type Entry = { at: number; value: unknown };

const store = new Map<string, Entry>();

function isFresh(entry: Entry): boolean {
  return Date.now() - entry.at <= LOOKUP_TTL_MS;
}

function readEntry(key: string): Entry | null {
  const memory = store.get(key);
  if (memory) {
    if (isFresh(memory)) return memory;
    store.delete(key);
  }

  const raw = readStored(STORAGE_PREFIX + key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Entry;
    if (typeof parsed?.at !== "number" || !isFresh(parsed)) {
      removeStored(STORAGE_PREFIX + key);
      return null;
    }
    store.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function cacheGet<T>(key: string): T | undefined {
  return readEntry(key)?.value as T | undefined;
}

/** Drop the oldest entries once the store is over its cap. */
function prune(): void {
  const keys = listStored(STORAGE_PREFIX);
  if (keys.length <= MAX_ENTRIES) return;

  const entries: { storageKey: string; at: number }[] = [];
  for (const storageKey of keys) {
    const raw = readStored(storageKey);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as Entry;
      if (typeof parsed?.at === "number") entries.push({ storageKey, at: parsed.at });
    } catch {
      // A corrupt row is removed on read anyway.
    }
  }

  entries.sort((a, b) => a.at - b.at);
  for (const extra of entries.slice(0, Math.max(0, entries.length - MAX_ENTRIES))) {
    removeStored(extra.storageKey);
    store.delete(extra.storageKey.slice(STORAGE_PREFIX.length));
  }
}

export function cacheSet(key: string, value: unknown) {
  const entry: Entry = { at: Date.now(), value };
  store.set(key, entry);
  writeStored(STORAGE_PREFIX + key, JSON.stringify(entry));
  prune();
}

export function cacheClear() {
  store.clear();
  for (const storageKey of listStored(STORAGE_PREFIX)) removeStored(storageKey);
}

export function dictLookupCacheKey(dictForm: string, surface?: string) {
  return `dict:${dictForm}:${surface ?? ""}`;
}

function contextHash(context: string): string {
  let hash = 2166136261;
  for (let index = 0; index < context.length; index += 1) {
    hash = Math.imul(hash ^ context.charCodeAt(index), 16777619);
  }
  return (hash >>> 0).toString(36);
}

/**
 * AI definitions are context-dependent: とる is "take" in one sentence and
 * "take a photo" in another. They are cached per sentence, so the same word in
 * a new sentence is looked up again instead of reusing another context's gloss.
 * Without a sentence there is nothing to scope by, and only the text is used.
 */
export function aiLookupCacheKey(text: string, kind: "word" | "phrase", context?: string) {
  const base = `ai:${kind}:${text}`;
  const trimmed = context?.trim();
  return trimmed ? `${base}:${contextHash(trimmed)}` : base;
}
