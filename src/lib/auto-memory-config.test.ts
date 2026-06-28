import { describe, it, expect, beforeEach, vi } from "vitest";

function mockStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
}

describe("auto-memory config", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", mockStorage());
  });

  it("defaults to OFF (propose-and-confirm)", async () => {
    const { getAutoMemory } = await import("./model-config");
    expect(getAutoMemory()).toBe(false);
  });

  it("round-trips on/off", async () => {
    const { getAutoMemory, setAutoMemory } = await import("./model-config");
    setAutoMemory(true);
    expect(getAutoMemory()).toBe(true);
    setAutoMemory(false);
    expect(getAutoMemory()).toBe(false);
  });
});
