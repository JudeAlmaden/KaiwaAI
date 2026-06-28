import { describe, it, expect, beforeEach, vi } from "vitest";

// jsdom isn't configured (node env), so stub a minimal localStorage.
function mockStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
}

describe("proactive-config", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", mockStorage());
  });

  it("defaults to ON when nothing is stored", async () => {
    const { getProactiveChat } = await import("./proactive-config");
    expect(getProactiveChat()).toBe(true);
  });

  it("round-trips an explicit off/on through localStorage", async () => {
    const { getProactiveChat, setProactiveChat } = await import(
      "./proactive-config"
    );
    setProactiveChat(false);
    expect(getProactiveChat()).toBe(false);
    setProactiveChat(true);
    expect(getProactiveChat()).toBe(true);
  });

  it("keeps follow-up chance and consecutive cap within sane bounds", async () => {
    const { PROACTIVE } = await import("./proactive-config");
    expect(PROACTIVE.followupChance).toBeGreaterThan(0);
    expect(PROACTIVE.followupChance).toBeLessThanOrEqual(1);
    expect(PROACTIVE.openerChance).toBeGreaterThan(0);
    expect(PROACTIVE.openerChance).toBeLessThanOrEqual(1);
    expect(PROACTIVE.maxConsecutive).toBeGreaterThanOrEqual(1);
    expect(PROACTIVE.followupDelayMax).toBeGreaterThanOrEqual(
      PROACTIVE.followupDelayMin,
    );
  });
});
