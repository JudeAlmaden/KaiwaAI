import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    kanjiMnemonic: { upsert: vi.fn(), deleteMany: vi.fn() },
    userKanji: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { saveKanjiMnemonic } from "./mnemonic-store";

describe("saveKanjiMnemonic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upserts the note and syncs an existing study card", async () => {
    vi.mocked(prisma.userKanji.findUnique).mockResolvedValue({ id: "uk-1" } as never);

    const result = await saveKanjiMnemonic("user-1", "kanji-1", "  Story text  ");

    expect(result).toEqual({ mnemonic: "Story text" });
    expect(prisma.kanjiMnemonic.upsert).toHaveBeenCalledWith({
      where: { userId_kanjiId: { userId: "user-1", kanjiId: "kanji-1" } },
      create: { userId: "user-1", kanjiId: "kanji-1", mnemonic: "Story text" },
      update: { mnemonic: "Story text" },
    });
    expect(prisma.userKanji.update).toHaveBeenCalledWith({
      where: { id: "uk-1" },
      data: { mnemonic: "Story text" },
    });
  });

  it("saves the note without creating a study card", async () => {
    vi.mocked(prisma.userKanji.findUnique).mockResolvedValue(null);

    const result = await saveKanjiMnemonic("user-1", "kanji-1", "Story text");

    expect(result).toEqual({ mnemonic: "Story text" });
    expect(prisma.kanjiMnemonic.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.userKanji.update).not.toHaveBeenCalled();
  });

  it("deletes the note and clears the synced card when given blank text", async () => {
    vi.mocked(prisma.userKanji.findUnique).mockResolvedValue({ id: "uk-1" } as never);

    const result = await saveKanjiMnemonic("user-1", "kanji-1", "   ");

    expect(result).toEqual({ mnemonic: null });
    expect(prisma.kanjiMnemonic.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1", kanjiId: "kanji-1" },
    });
    expect(prisma.kanjiMnemonic.upsert).not.toHaveBeenCalled();
    expect(prisma.userKanji.update).toHaveBeenCalledWith({
      where: { id: "uk-1" },
      data: { mnemonic: null },
    });
  });

  it("deletes the note quietly when no study card exists", async () => {
    vi.mocked(prisma.userKanji.findUnique).mockResolvedValue(null);

    const result = await saveKanjiMnemonic("user-1", "kanji-1", "");

    expect(result).toEqual({ mnemonic: null });
    expect(prisma.kanjiMnemonic.deleteMany).toHaveBeenCalledTimes(1);
    expect(prisma.userKanji.update).not.toHaveBeenCalled();
  });
});
