import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUnlockStatus, grantUnlock, clearUnlockStorage } from "./app-blocker-unlock";
import { AppBlocker } from "@/plugins/app-blocker";

vi.mock("@/plugins/app-blocker", () => ({
  AppBlocker: {
    isUnlockActive: vi.fn(),
    markFlashcardsCompleted: vi.fn(),
  },
}));

// Mock localStorage for node environment
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    for (const key of Object.keys(store)) {
      delete store[key];
    }
  },
};
vi.stubGlobal("localStorage", localStorageMock);

describe("app-blocker-unlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("getUnlockStatus", () => {
    it("returns active status from native plugin and saves to localStorage", async () => {
      const expiresAt = Date.now() + 60000;
      vi.mocked(AppBlocker.isUnlockActive).mockResolvedValueOnce({ active: true, expiresAt });

      const status = await getUnlockStatus();
      expect(status).toEqual({ active: true, expiresAt });
      expect(localStorage.getItem("kaiwa_unlock_expiry")).toBe(String(expiresAt));
    });

    it("clears localStorage if native plugin returns inactive", async () => {
      localStorage.setItem("kaiwa_unlock_expiry", "12345");
      vi.mocked(AppBlocker.isUnlockActive).mockResolvedValueOnce({ active: false, expiresAt: 0 });

      const status = await getUnlockStatus();
      expect(status).toEqual({ active: false, expiresAt: 0 });
      expect(localStorage.getItem("kaiwa_unlock_expiry")).toBeNull();
    });

    it("falls back to localStorage if native plugin throws (e.g. web/offline)", async () => {
      const futureTime = Date.now() + 100000;
      localStorage.setItem("kaiwa_unlock_expiry", String(futureTime));
      vi.mocked(AppBlocker.isUnlockActive).mockRejectedValueOnce(new Error("Native unavailable"));

      const status = await getUnlockStatus();
      expect(status).toEqual({ active: true, expiresAt: futureTime });
    });

    it("returns inactive if localStorage expiry is in the past when native fails", async () => {
      const pastTime = Date.now() - 10000;
      localStorage.setItem("kaiwa_unlock_expiry", String(pastTime));
      vi.mocked(AppBlocker.isUnlockActive).mockRejectedValueOnce(new Error("Native unavailable"));

      const status = await getUnlockStatus();
      expect(status).toEqual({ active: false, expiresAt: 0 });
      expect(localStorage.getItem("kaiwa_unlock_expiry")).toBeNull();
    });
  });

  describe("grantUnlock", () => {
    it("calls markFlashcardsCompleted and gets status", async () => {
      const expiresAt = Date.now() + 900000;
      vi.mocked(AppBlocker.markFlashcardsCompleted).mockResolvedValueOnce();
      vi.mocked(AppBlocker.isUnlockActive).mockResolvedValueOnce({ active: true, expiresAt });

      const status = await grantUnlock();
      expect(AppBlocker.markFlashcardsCompleted).toHaveBeenCalled();
      expect(status).toEqual({ active: true, expiresAt });
    });
  });

  describe("clearUnlockStorage", () => {
    it("removes key from localStorage", () => {
      localStorage.setItem("kaiwa_unlock_expiry", "99999");
      clearUnlockStorage();
      expect(localStorage.getItem("kaiwa_unlock_expiry")).toBeNull();
    });
  });
});
