import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    kanji: { findMany: vi.fn() },
    userKanji: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { loadComponentMap } from "./context.server";

describe("loadComponentMap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves every primitive in a single batched query", async () => {
    vi.mocked(prisma.kanji.findMany).mockResolvedValue([
      { character: "八", heisigKeyword: "eight", heisigNumber: 42, meanings: '["eight"]' },
    ] as never);
    vi.mocked(prisma.userKanji.findMany).mockResolvedValue([
      {
        customMeaning: "two legs",
        mnemonic: "Two legs spread apart.",
        kanji: { character: "八" },
      },
    ] as never);

    const map = await loadComponentMap("user-1", ["亠", "八", "八"]);

    expect(prisma.kanji.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.userKanji.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.kanji.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { character: { in: ["亠", "八"] } },
      })
    );
    expect(map.get("八")).toMatchObject({
      glyph: "八",
      keyword: "two legs",
      heisigNumber: 42,
      inDictionary: true,
      userMnemonic: "Two legs spread apart.",
    });
    expect(map.get("亠")).toMatchObject({ glyph: "亠", inDictionary: false });
  });

  it("returns an empty map without querying when there are no primitives", async () => {
    const map = await loadComponentMap("user-1", []);

    expect(map.size).toBe(0);
    expect(prisma.kanji.findMany).not.toHaveBeenCalled();
    expect(prisma.userKanji.findMany).not.toHaveBeenCalled();
  });
});
