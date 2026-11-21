import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  clampNotchOffset,
  getMobileNotchOffset,
  setMobileNotchOffset,
  applyMobileNotchOffset,
  MOBILE_NOTCH_STORAGE_KEY,
  DEFAULT_NOTCH_OFFSET,
  MAX_NOTCH_OFFSET,
  MIN_NOTCH_OFFSET,
} from "./mobile-notch";

const mockStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  };
};

describe("mobile-notch utility", () => {
  beforeEach(() => {
    const storage = mockStorage();
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("window", { localStorage: storage });
  });

  it("clamps notch offset between MIN and MAX", () => {
    expect(clampNotchOffset(-10)).toBe(MIN_NOTCH_OFFSET);
    expect(clampNotchOffset(0)).toBe(0);
    expect(clampNotchOffset(35.4)).toBe(35);
    expect(clampNotchOffset(200)).toBe(MAX_NOTCH_OFFSET);
    expect(clampNotchOffset(NaN)).toBe(DEFAULT_NOTCH_OFFSET);
  });

  it("returns default offset when nothing stored", () => {
    expect(getMobileNotchOffset()).toBe(0);
  });

  it("stores and retrieves custom offset", () => {
    const saved = setMobileNotchOffset(32);
    expect(saved).toBe(32);
    expect(getMobileNotchOffset()).toBe(32);
    expect(window.localStorage.getItem(MOBILE_NOTCH_STORAGE_KEY)).toBe("32");
  });

  it("applies offset to document CSS variable", () => {
    const setProperty = vi.fn();
    vi.stubGlobal("document", {
      documentElement: {
        style: {
          setProperty,
        },
      },
    });

    applyMobileNotchOffset(40);
    expect(setProperty).toHaveBeenCalledWith("--mobile-notch-offset", "40px");
  });
});
