import { describe, expect, it } from "vitest";
import { POOL_TTL_MS, decodePool, decodeRound, encodePool, encodeRound } from "./practice-cache";

const now = new Date("2026-11-25T09:00:00");

describe("fill the blank pool cache", () => {
  it("round trips targets for the same study mode", () => {
    const raw = encodePool([{ word: "書く" }, { word: "食べる" }], "due", now);
    expect(decodePool<{ word: string }>(raw, "due", now)).toEqual([
      { word: "書く" },
      { word: "食べる" },
    ]);
  });

  it("rejects another mode, an expired pool and junk", () => {
    const raw = encodePool([{ word: "書く" }], "due", now);
    expect(decodePool(raw, "all", now)).toBeNull();
    expect(decodePool(raw, "due", new Date(now.getTime() + POOL_TTL_MS + 1))).toBeNull();
    expect(decodePool("{oops", "due", now)).toBeNull();
    expect(decodePool(null, "due", now)).toBeNull();
  });

  it("ignores an empty pool so the page still fetches", () => {
    expect(decodePool(encodePool([], "due", now), "due", now)).toBeNull();
  });
});

describe("fill the blank round pointer", () => {
  it("round trips today's round and forgets older ones", () => {
    const raw = encodeRound({ word: "書く", formType: "masu" }, now);
    expect(decodeRound(raw, now)).toEqual({ word: "書く", formType: "masu" });
    expect(decodeRound(raw, new Date("2026-11-26T09:00:00"))).toBeNull();
  });

  it("rejects incomplete pointers", () => {
    expect(decodeRound(JSON.stringify({ day: "2026-11-25", word: "書く" }), now)).toBeNull();
    expect(decodeRound("nope", now)).toBeNull();
  });
});
