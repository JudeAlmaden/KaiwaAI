import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  LOOKUP_TTL_MS,
  aiLookupCacheKey,
  cacheGet,
  cacheSet,
  cacheClear,
  dictLookupCacheKey,
} from "./lookup-cache";

describe("lookup-cache", () => {
  beforeEach(() => {
    cacheClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cacheClear();
  });

  it("builds stable dict keys", () => {
    expect(dictLookupCacheKey("食べる", "食べた")).toBe("dict:食べる:食べた");
    expect(dictLookupCacheKey("猫")).toBe("dict:猫:");
    expect(aiLookupCacheKey("猫", "word")).toBe("ai:word:猫");
    expect(aiLookupCacheKey("とる", "word", "写真をとる")).toBe(
      aiLookupCacheKey("とる", "word", "写真をとる")
    );
    // Different sentences must not share an AI definition.
    expect(aiLookupCacheKey("とる", "word", "写真をとる")).not.toBe(
      aiLookupCacheKey("とる", "word", "席をとる")
    );
  });

  it("round-trips values", () => {
    cacheSet("k", { ok: true });
    expect(cacheGet<{ ok: boolean }>("k")).toEqual({ ok: true });
  });

  it("expires after TTL", () => {
    cacheSet("ttl", 1);
    expect(cacheGet<number>("ttl")).toBe(1);
    vi.advanceTimersByTime(LOOKUP_TTL_MS + 1);
    expect(cacheGet<number>("ttl")).toBeUndefined();
  });

  it("clear wipes all entries", () => {
    cacheSet("a", 1);
    cacheSet("b", 2);
    cacheClear();
    expect(cacheGet("a")).toBeUndefined();
    expect(cacheGet("b")).toBeUndefined();
  });
});
