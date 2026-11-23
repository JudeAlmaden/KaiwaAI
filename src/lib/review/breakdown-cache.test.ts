import { describe, it, expect, beforeEach, vi } from "vitest";

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
});
vi.stubGlobal("window", {});

import {
  BREAKDOWN_CACHE_KEY,
  cacheBreakdown,
  readCachedBreakdown,
} from "./breakdown-cache";
import type { CardBreakdown } from "@/lib/card-breakdown-client";

const SIG = "忙しい|busy|心,配";

const sample: CardBreakdown = {
  mnemonic: "A busy heart on the left, a tired body on the right.",
  lookalikes: [{ jp: "急ぐ", note: "hurrying, not busy" }],
  examples: [{ jp: "今日は忙しい。", en: "I'm busy today." }],
};

describe("breakdown cache", () => {
  beforeEach(() => store.clear());

  it("returns null when nothing is cached", () => {
    expect(readCachedBreakdown("card-1", SIG)).toBeNull();
  });

  it("stores and reads a breakdown by card id and content", () => {
    cacheBreakdown("card-1", SIG, sample);
    expect(readCachedBreakdown("card-1", SIG)).toEqual(sample);
  });

  it("keeps cards separate", () => {
    cacheBreakdown("card-1", SIG, sample);
    expect(readCachedBreakdown("card-2", SIG)).toBeNull();
  });

  it("stops serving a hint after the card content changes", () => {
    cacheBreakdown("card-1", SIG, sample);
    expect(readCachedBreakdown("card-1", "忙しい|busy|心")).toBeNull();
  });

  it("ignores malformed cache data instead of throwing", () => {
    store.set(BREAKDOWN_CACHE_KEY, "not json");
    expect(readCachedBreakdown("card-1", SIG)).toBeNull();
  });

  it("caps the cache so localStorage cannot grow forever", () => {
    for (let i = 0; i < 105; i++) {
      cacheBreakdown(`card-${i}`, SIG, { ...sample, mnemonic: `story ${i}` });
    }
    expect(readCachedBreakdown("card-0", SIG)).toBeNull();
    expect(readCachedBreakdown("card-104", SIG)).not.toBeNull();
  });
});
