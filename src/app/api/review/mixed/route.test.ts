import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userFlashcard: {
      findMany: vi.fn(),
    },
    userKanji: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

describe("Mixed Review API - GET (/api/review/mixed)", () => {
  const mockUser = { id: "user-123", email: "test@example.com" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

    const req = new Request("http://localhost/api/review/mixed");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("composes session with both vocab and kanji cards", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);

    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValueOnce([
      {
        id: "uf-1",
        userId: "user-123",
        status: "learning",
        easeFactor: 2.5,
        repetitions: 2,
        interval: 5,
        nextReview: new Date(Date.now() - 10000),
        createdAt: new Date("2026-01-01"),
        word: {
          id: "w-1",
          dictionary: "食べる",
          reading: "たべる",
          meanings: '["to eat"]',
          partOfSpeech: "verb",
        },
        wordForm: null,
        phrase: null,
      },
    ] as never);

    vi.mocked(prisma.userKanji.findMany).mockResolvedValueOnce([
      {
        id: "uk-1",
        userId: "user-123",
        status: "learning",
        easeFactor: 2.5,
        repetitions: 2,
        interval: 5,
        nextReview: new Date(Date.now() - 10000),
        createdAt: new Date("2026-01-01"),
        kanji: {
          id: "k-1",
          character: "食",
          meanings: '["eat","food"]',
          readingsOn: '["ショク"]',
          readingsKun: '["た.べる"]',
          radicals: '["飠"]',
          primitives: '["eat"]',
          heisigNumber: 42,
          heisigKeyword: "eat",
          heisigLesson: 4,
        },
        customMeaning: "eat",
        mnemonic: "Picture someone eating",
      },
    ] as never);

    const req = new Request("http://localhost/api/review/mixed?studyMode=due&limit=10");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.cards.length).toBe(2);

    const vocabCard = data.cards.find((c: { type: string }) => c.type === "vocabulary");
    const kanjiCard = data.cards.find((c: { type: string }) => c.type === "kanji");

    expect(vocabCard).toBeDefined();
    expect(vocabCard.word).toBe("食べる");
    expect(vocabCard.meaning).toBe("to eat");

    expect(kanjiCard).toBeDefined();
    expect(kanjiCard.character).toBe("食");
    expect(kanjiCard.meanings).toEqual(["eat", "food"]);
    expect(kanjiCard.primitives).toEqual(["eat"]);
    expect(kanjiCard.customMeaning).toBe("eat");
  });

  it("handles struggling mode (The Gauntlet) with easeFactor < 2.0 filter", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);

    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValueOnce([
      {
        id: "uf-struggle",
        userId: "user-123",
        status: "learning",
        easeFactor: 1.7,
        repetitions: 4,
        interval: 2,
        nextReview: new Date(),
        createdAt: new Date(),
        word: {
          dictionary: "難しい",
          reading: "むずかしい",
          meanings: '["difficult"]',
          partOfSpeech: "adjective",
        },
        wordForm: null,
        phrase: null,
      },
    ] as never);

    vi.mocked(prisma.userKanji.findMany).mockResolvedValueOnce([] as never);

    const req = new Request("http://localhost/api/review/mixed?studyMode=struggling&limit=50");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.cards.length).toBe(1);
    expect(data.cards[0].word).toBe("難しい");
    expect(prisma.userFlashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-123",
          easeFactor: { lt: 2.0 },
        }),
      })
    );
  });

  it("safely parses malformed JSON without crashing", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);

    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValueOnce([
      {
        id: "uf-broken",
        userId: "user-123",
        status: "learning",
        easeFactor: 2.5,
        repetitions: 1,
        interval: 1,
        nextReview: new Date(),
        createdAt: new Date(),
        word: {
          dictionary: "言葉",
          reading: "ことば",
          meanings: "INVALID_JSON_STRING",
          partOfSpeech: "noun",
        },
        wordForm: null,
        phrase: null,
      },
    ] as never);

    vi.mocked(prisma.userKanji.findMany).mockResolvedValueOnce([
      {
        id: "uk-broken",
        userId: "user-123",
        status: "learning",
        easeFactor: 2.5,
        repetitions: 1,
        interval: 1,
        nextReview: new Date(),
        createdAt: new Date(),
        kanji: {
          id: "k-broken",
          character: "言",
          meanings: "NOT_JSON",
          readingsOn: "NOT_JSON",
          readingsKun: "NOT_JSON",
          radicals: "NOT_JSON",
          primitives: "NOT_JSON",
          heisigNumber: null,
          heisigKeyword: null,
          heisigLesson: null,
        },
        customMeaning: null,
        mnemonic: null,
      },
    ] as never);

    const req = new Request("http://localhost/api/review/mixed?studyMode=all&limit=10");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.cards.length).toBe(2);
    const brokenKanji = data.cards.find((c: { type: string }) => c.type === "kanji");
    expect(brokenKanji.meanings).toEqual([]);
    expect(brokenKanji.readingsOn).toEqual([]);
    expect(brokenKanji.primitives).toEqual([]);
  });
});
