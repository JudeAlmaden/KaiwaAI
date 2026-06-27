import { describe, it, expect, beforeEach, vi } from "vitest";

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
});
vi.stubGlobal("window", {});

import {
  listKeys,
  addKey,
  removeKey,
  hasAnyKey,
  getActiveIndex,
  setActiveIndex,
  keysForRequest,
} from "./api-keys";

describe("api-keys", () => {
  beforeEach(() => store.clear());

  it("starts empty", () => {
    expect(hasAnyKey()).toBe(false);
    expect(listKeys()).toEqual([]);
  });

  it("adds keys with default labels and dedupes", () => {
    addKey("AAA");
    addKey("BBB", "Work");
    addKey("AAA"); // duplicate ignored
    const keys = listKeys();
    expect(keys).toHaveLength(2);
    expect(keys[0]).toEqual({ label: "Key 1", key: "AAA" });
    expect(keys[1]).toEqual({ label: "Work", key: "BBB" });
  });

  it("migrates a legacy single key into the list", () => {
    store.set("kaiwa_gemini_key", "LEGACY");
    const keys = listKeys();
    expect(keys[0].key).toBe("LEGACY");
    expect(store.get("kaiwa_gemini_key")).toBeUndefined();
  });

  it("orders keysForRequest with the active key first", () => {
    addKey("AAA");
    addKey("BBB");
    addKey("CCC");
    setActiveIndex(2);
    expect(keysForRequest()).toEqual(["CCC", "AAA", "BBB"]);
  });

  it("clamps the active index when a key is removed", () => {
    addKey("AAA");
    addKey("BBB");
    setActiveIndex(1);
    removeKey(1);
    expect(getActiveIndex()).toBe(0);
    expect(listKeys()).toHaveLength(1);
  });
});
