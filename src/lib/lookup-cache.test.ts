import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
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
  });

  it("round-trips values", () => {
    cacheSet("k", { ok: true });
    expect(cacheGet<{ ok: boolean }>("k")).toEqual({ ok: true });
  });

  it("expires after TTL", () => {
    cacheSet("ttl", 1);
    expect(cacheGet<number>("ttl")).toBe(1);
    vi.advanceTimersByTime(10 * 60 * 1000 + 1);
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
