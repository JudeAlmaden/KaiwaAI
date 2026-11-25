/**
 * Guarded browser storage.
 *
 * localStorage can be unavailable (private mode, blocked cookies) or full.
 * None of those are worth surfacing: the practice screens work without a
 * stored value, they just start fresh.
 */

export function readStored(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Quota or private mode: keep working in memory.
  }
}

export function listStored(prefix: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const keys: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && key.startsWith(prefix)) keys.push(key);
    }
    return keys;
  } catch {
    return [];
  }
}

export function removeStored(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing to clean up then.
  }
}
