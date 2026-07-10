// Manages the user's Gemini API key(s), client-side only (localStorage).
// Supports multiple keys so the app can rotate when one hits its rate limit.

const LEGACY_KEY = "kaiwa_gemini_key"; // old single-key storage
const KEYS_KEY = "kaiwa_gemini_keys"; // JSON: { label, key }[]
const ACTIVE_KEY = "kaiwa_gemini_active"; // index of preferred key

export type ApiKeyEntry = { label: string; key: string };

function read(): ApiKeyEntry[] {
  if (typeof window === "undefined") return [];
  // migrate a legacy single key into the list on first read
  const legacy = localStorage.getItem(LEGACY_KEY);
  const raw = localStorage.getItem(KEYS_KEY);
  let list: ApiKeyEntry[] = [];
  if (raw) {
    try {
      list = JSON.parse(raw);
    } catch {
      list = [];
    }
  }
  if (legacy && !list.some((e) => e.key === legacy)) {
    list.unshift({ label: "Key 1", key: legacy });
    localStorage.removeItem(LEGACY_KEY);
    write(list);
  }
  return list;
}

function write(list: ApiKeyEntry[]) {
  localStorage.setItem(KEYS_KEY, JSON.stringify(list));
}

export function listKeys(): ApiKeyEntry[] {
  return read();
}

export function hasAnyKey(): boolean {
  return read().length > 0;
}

export function addKey(key: string, label?: string) {
  const list = read();
  const trimmed = key.trim();
  if (!trimmed || list.some((e) => e.key === trimmed)) return;
  list.push({ label: label?.trim() || `Key ${list.length + 1}`, key: trimmed });
  write(list);
  // Set as active if it's the first key
  if (list.length === 1) {
    setActiveIndex(0);
  }
}

export function removeKey(index: number) {
  const list = read();
  list.splice(index, 1);
  write(list);
  const active = getActiveIndex();
  if (active >= list.length) setActiveIndex(Math.max(0, list.length - 1));
}

export function getActiveIndex(): number {
  if (typeof window === "undefined") return 0;
  const n = Number(localStorage.getItem(ACTIVE_KEY));
  const list = read();
  return Number.isInteger(n) && n >= 0 && n < list.length ? n : 0;
}

export function setActiveIndex(i: number) {
  localStorage.setItem(ACTIVE_KEY, String(i));
}

/** Active key first, then the rest — the rotation order for a single request. */
export function keysForRequest(): string[] {
  const list = read();
  if (list.length === 0) return [];
  const active = getActiveIndex();
  const ordered = [list[active], ...list.filter((_, i) => i !== active)];
  return ordered.map((e) => e.key);
}

/** Validate API key format (basic check) */
export function isValidKeyFormat(key: string): boolean {
  const trimmed = key.trim();
  // Gemini API keys start with "AIza" and are typically 39 characters
  return trimmed.startsWith("AIza") && trimmed.length > 30;
}

/** Test API key with actual API call */
export async function validateApiKey(key: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key.trim()}`
    );

    if (response.ok) {
      return { valid: true };
    }

    if (response.status === 400) {
      return { valid: false, error: "Invalid API key format" };
    }
    if (response.status === 403) {
      return { valid: false, error: "API key access denied" };
    }
    if (response.status === 429) {
      return { valid: false, error: "Rate limit exceeded" };
    }

    return { valid: false, error: "Could not validate API key" };
  } catch {
    return { valid: false, error: "Network error - check your connection" };
  }
}
