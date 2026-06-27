import { describe, it, expect, beforeEach, vi } from "vitest";

// jsdom-free localStorage stub
const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
});
vi.stubGlobal("window", {});

import {
  MODELS,
  DEFAULT_MODEL,
  DEFAULT_MAX_OUTPUT_TOKENS,
  OUTPUT_TOKEN_OPTIONS,
  getModel,
  setModel,
  getMaxOutputTokens,
  setMaxOutputTokens,
  getAutoFallback,
  setAutoFallback,
  modelFallbackOrder,
} from "./model-config";

describe("model-config", () => {
  beforeEach(() => store.clear());

  it("the default model is one of the registered models", () => {
    expect(MODELS.some((m) => m.id === DEFAULT_MODEL)).toBe(true);
  });

  it("every model has a unique id", () => {
    const ids = MODELS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("returns the default when nothing is stored", () => {
    expect(getModel()).toBe(DEFAULT_MODEL);
  });

  it("persists and reads back a valid model", () => {
    setModel("gemini-2.5-flash-lite");
    expect(getModel()).toBe("gemini-2.5-flash-lite");
  });

  it("ignores an unknown stored model and falls back to default", () => {
    store.set("kaiwa_gemini_model", "totally-fake-model");
    expect(getModel()).toBe(DEFAULT_MODEL);
  });

  it("defaults and validates output tokens", () => {
    expect(getMaxOutputTokens()).toBe(DEFAULT_MAX_OUTPUT_TOKENS);
    setMaxOutputTokens(OUTPUT_TOKEN_OPTIONS[0]);
    expect(getMaxOutputTokens()).toBe(OUTPUT_TOKEN_OPTIONS[0]);
    store.set("kaiwa_max_output_tokens", "99999");
    expect(getMaxOutputTokens()).toBe(DEFAULT_MAX_OUTPUT_TOKENS);
  });

  it("auto-fallback is on by default and can be toggled", () => {
    expect(getAutoFallback()).toBe(true);
    setAutoFallback(false);
    expect(getAutoFallback()).toBe(false);
  });

  it("fallback order puts the chosen model first, then others lite→pro", () => {
    setModel("gemini-2.5-flash");
    const order = modelFallbackOrder();
    expect(order[0]).toBe("gemini-2.5-flash");
    expect(order).toHaveLength(MODELS.length);
    // chosen model appears exactly once
    expect(order.filter((m) => m === "gemini-2.5-flash")).toHaveLength(1);
    // the rest are sorted lite-first among themselves
    const restTiers = order
      .slice(1)
      .map((id) => MODELS.find((m) => m.id === id)!.tier);
    const rank = { lite: 0, balanced: 1, pro: 2 } as const;
    for (let i = 1; i < restTiers.length; i++) {
      expect(rank[restTiers[i]]).toBeGreaterThanOrEqual(rank[restTiers[i - 1]]);
    }
  });
});
