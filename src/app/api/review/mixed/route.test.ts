import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userFlashcard: { findMany: vi.fn() },
    userKanji: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/auth-helpers");

describe("/api/review/mixed GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not logged in", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const req = new Request("http://localhost/api/review/mixed");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("fetches and shuffles vocabulary and kanji cards", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user1", username: "test" } as never);
    
    const mockVocab = [
      {
        id: "v1",
        word: "猫",
        reading: "ねこ",
        romaji: "neko",
        meaning: "cat",
        partOfSpeech: "noun",
        status: "learning",
      },
    ];
    
    const mockKanji = [
      {
        id: "k1",
        kanji: {
          character: "猫",
          meanings: '["cat"]',
          readingsOn: '["ビョウ"]',
          readingsKun: '["ねこ"]',
        },
        mnemonic: "A cat with claws",
        status: "learning",
      },
    ];

    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValue(mockVocab as never);
    vi.mocked(prisma.userKanji.findMany).mockResolvedValue(mockKanji as never);

    const req = new Request("http://localhost/api/review/mixed?studyMode=due&limit=20");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.cards).toHaveLength(2);
    expect(json.cards.some((c: { type: string }) => c.type === "vocabulary")).toBe(true);
    expect(json.cards.some((c: { type: string }) => c.type === "kanji")).toBe(true);
  });

  it("respects limit parameter", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user1", username: "test" } as never);
    
    const mockVocab = Array.from({ length: 50 }, (_, i) => ({
      id: `v${i}`,
      word: "word",
      reading: "reading",
      romaji: "romaji",
      meaning: "meaning",
      partOfSpeech: "noun",
      status: "learning",
    }));
    
    const mockKanji = Array.from({ length: 50 }, (_, i) => ({
      id: `k${i}`,
      kanji: {
        character: "字",
        meanings: '["character"]',
        readingsOn: '["ジ"]',
        readingsKun: '["あざ"]',
      },
      mnemonic: "test",
      status: "learning",
    }));

    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValue(mockVocab as never);
    vi.mocked(prisma.userKanji.findMany).mockResolvedValue(mockKanji as never);

    const req = new Request("http://localhost/api/review/mixed?limit=10");
    const res = await GET(req);
    const json = await res.json();

    expect(json.cards.length).toBeLessThanOrEqual(10);
  });

  it("handles empty results gracefully", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user1", username: "test" } as never);
    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValue([]);
    vi.mocked(prisma.userKanji.findMany).mockResolvedValue([]);

    const req = new Request("http://localhost/api/review/mixed");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.cards).toHaveLength(0);
  });
});
