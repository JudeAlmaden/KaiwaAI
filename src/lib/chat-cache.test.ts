import { describe, it, expect, beforeEach, vi } from "vitest";

function mockStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
    _keys: () => [...store.keys()],
  };
}

describe("chat-cache", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", mockStorage());
  });

  it("reads/writes/removes JSON values", async () => {
    const c = await import("./chat-cache");
    c.writeCache("k", { a: 1 });
    expect(c.readCache<{ a: number }>("k")).toEqual({ a: 1 });
    c.removeCache("k");
    expect(c.readCache("k")).toBeNull();
  });

  it("readCache returns null on malformed JSON", async () => {
    const c = await import("./chat-cache");
    localStorage.setItem("bad", "{not json");
    expect(c.readCache("bad")).toBeNull();
  });

  it("dropFromConvosCache removes only the targeted conversation", async () => {
    const c = await import("./chat-cache");
    c.writeCache(c.cacheKeys.convos, [{ id: "a" }, { id: "b" }, { id: "c" }]);
    c.dropFromConvosCache("b");
    expect(c.readCache(c.cacheKeys.convos)).toEqual([{ id: "a" }, { id: "c" }]);
  });

  it("clearConversationCache removes transcript + list entry", async () => {
    const c = await import("./chat-cache");
    c.writeCache(c.cacheKeys.conv("x"), { messages: [] });
    c.writeCache(c.cacheKeys.convos, [{ id: "x" }, { id: "y" }]);
    c.clearConversationCache("x");
    expect(c.readCache(c.cacheKeys.conv("x"))).toBeNull();
    expect(c.readCache(c.cacheKeys.convos)).toEqual([{ id: "y" }]);
  });

  it("clearAllChatCache wipes every kaiwa chat key but leaves others", async () => {
    const c = await import("./chat-cache");
    c.writeCache(c.cacheKeys.kai, []);
    c.writeCache(c.cacheKeys.convos, []);
    c.writeCache(c.cacheKeys.personas, []);
    c.writeCache(c.cacheKeys.conv("z"), {});
    localStorage.setItem("unrelated", "keep");
    c.clearAllChatCache();
    expect(c.readCache(c.cacheKeys.kai)).toBeNull();
    expect(c.readCache(c.cacheKeys.conv("z"))).toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("keep");
  });

  describe("unread tracking", () => {
    const NEW = "2026-06-28T10:00:00.000Z";
    const OLD = "2026-06-28T09:00:00.000Z";

    it("is unread when there's a message and the convo was never opened", async () => {
      const c = await import("./chat-cache");
      expect(c.isUnread("g1", NEW, false)).toBe(true);
    });

    it("is not unread when the last message is mine", async () => {
      const c = await import("./chat-cache");
      expect(c.isUnread("g1", NEW, true)).toBe(false);
    });

    it("is not unread when there's no activity", async () => {
      const c = await import("./chat-cache");
      expect(c.isUnread("g1", undefined, false)).toBe(false);
    });

    it("clears once seen up to the latest activity", async () => {
      const c = await import("./chat-cache");
      c.markConversationSeen("g1", NEW);
      expect(c.isUnread("g1", NEW, false)).toBe(false);
    });

    it("re-flags when newer activity arrives after being seen", async () => {
      const c = await import("./chat-cache");
      c.markConversationSeen("g1", OLD);
      expect(c.isUnread("g1", NEW, false)).toBe(true);
    });
  });
});
