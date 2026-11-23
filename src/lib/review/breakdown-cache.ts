import type { CardBreakdown } from "@/lib/card-breakdown-client";

export const BREAKDOWN_CACHE_KEY = "kaiwa_card_breakdowns";
const MAX_ENTRIES = 100;

type Cache = Record<string, CardBreakdown>;

function read(): Cache {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(BREAKDOWN_CACHE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Cache;
  } catch {
    return {};
  }
}

function cacheKey(cardId: string, signature: string): string {
  return `${cardId}::${signature}`;
}

/**
 * The last breakdown Kai wrote for this card and content, if still cached.
 * The signature makes an edited meaning or mnemonic invalidate the hint.
 */
export function readCachedBreakdown(
  cardId: string,
  signature: string
): CardBreakdown | null {
  const entry = read()[cacheKey(cardId, signature)];
  return entry && typeof entry.mnemonic === "string" ? entry : null;
}

/** Remember a breakdown so flipping away and back doesn't pay for it twice. */
export function cacheBreakdown(
  cardId: string,
  signature: string,
  breakdown: CardBreakdown
): void {
  if (typeof window === "undefined") return;

  const entries = read();
  entries[cacheKey(cardId, signature)] = breakdown;

  const ids = Object.keys(entries);
  for (const id of ids.slice(0, Math.max(0, ids.length - MAX_ENTRIES))) {
    delete entries[id];
  }

  try {
    localStorage.setItem(BREAKDOWN_CACHE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full or blocked — the breakdown still renders for this card.
  }
}
