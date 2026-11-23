import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveKanjiMnemonicClient } from "./save-client";

describe("saveKanjiMnemonicClient", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("PUTs the note to the single mnemonic route", async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: true } as Response);

    const ok = await saveKanjiMnemonicClient("六", "A lid over two legs.");

    expect(ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/kanji/%E5%85%AD/mnemonic",
      expect.objectContaining({
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mnemonic: "A lid over two legs." }),
      })
    );
  });

  it("returns false instead of throwing when the save fails", async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: false, status: 500 } as Response);

    await expect(saveKanjiMnemonicClient("六", "Story")).resolves.toBe(false);
  });

  it("returns false when the request itself rejects", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("offline"));

    await expect(saveKanjiMnemonicClient("六", "Story")).resolves.toBe(false);
  });
});
