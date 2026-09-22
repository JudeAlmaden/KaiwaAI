/** Tiny in-memory cache for dictionary / kanji lookups within a session. */

const store = new Map<string, { at: number; value: unknown }>();
const DEFAULT_TTL_MS = 10 * 60 * 1000;

export function cacheGet<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > DEFAULT_TTL_MS) {
    store.delete(key);
    return undefined;
  }
  return hit.value as T;
}

export function cacheSet(key: string, value: unknown) {
  store.set(key, { at: Date.now(), value });
}

export function cacheClear() {
  store.clear();
}

export function dictLookupCacheKey(dictForm: string, surface?: string) {
  return `dict:${dictForm}:${surface ?? ""}`;
}
