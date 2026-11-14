import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userFlashcard: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    userKanji: {
      findMany: vi.fn(),
      count: vi.fn(),
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
    // reset (not clear): the new-card tests install persistent implementations
    // that must not leak into the next test.
    vi.resetAllMocks();
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

  it("never introduces more new cards than the per-session quota", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ ...mockUser, timezone: "Asia/Manila" } as never);

    const vocabNew = Array.from({ length: 10 }, (_, i) => ({
      id: `uf-new-${i}`,
      userId: "user-123",
      status: "learning",
      easeFactor: 2.5,
      repetitions: 0,
      interval: 0,
      nextReview: new Date(Date.now() - 60000),
      createdAt: new Date("2026-01-01"),
      lastReviewedAt: null,
      word: {
        dictionary: `言葉${i}`,
        reading: "ことば",
        meanings: '["word"]',
        partOfSpeech: "noun",
      },
      wordForm: null,
      phrase: null,
    }));

    const kanjiNew = Array.from({ length: 10 }, (_, i) => ({
      id: `uk-new-${i}`,
      userId: "user-123",
      status: "learning",
      easeFactor: 2.5,
      repetitions: 0,
      interval: 0,
      nextReview: new Date(Date.now() - 60000),
      createdAt: new Date("2026-01-01"),
      lastReviewedAt: null,
      kanji: {
        id: `k-${i}`,
        character: "食",
        meanings: '["eat"]',
        readingsOn: "[]",
        readingsKun: "[]",
        radicals: "[]",
        primitives: "[]",
        heisigNumber: null,
        heisigKeyword: null,
        heisigLesson: null,
      },
      customMeaning: null,
      mnemonic: null,
    }));

    // Not `Once`: maintenance top-ups may query again.
    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValue(vocabNew as never);
    vi.mocked(prisma.userKanji.findMany).mockResolvedValue(kanjiNew as never);
    vi.mocked(prisma.userFlashcard.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.userKanji.count).mockResolvedValue(0 as never);

    const req = new Request(
      "http://localhost/api/review/mixed?studyMode=due&limit=10&newPerSession=3"
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    const newCards = data.cards.filter(
      (c: { repetitions?: number }) => (c.repetitions ?? 0) === 0
    );
    // Splitting 3 across two pools used to round each half up: 2 + 2 = 4.
    expect(newCards.length).toBe(3);
  });

  it("does not spend the new-card allowance twice when backfilling", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ ...mockUser, timezone: "Asia/Manila" } as never);

    const vocab = (i: number) => ({
      id: `uf-short-${i}`,
      userId: "user-123",
      status: "learning",
      easeFactor: 2.5,
      repetitions: 0,
      interval: 0,
      nextReview: new Date(Date.now() - 60000),
      createdAt: new Date("2026-01-01"),
      lastReviewedAt: null,
      word: {
        dictionary: `言葉${i}`,
        reading: "ことば",
        meanings: '["word"]',
        partOfSpeech: "noun",
      },
      wordForm: null,
      phrase: null,
    });

    const kanji = (i: number, repetitions: number) => ({
      id: `uk-${repetitions}-${i}`,
      userId: "user-123",
      status: "learning",
      easeFactor: 2.5,
      repetitions,
      interval: repetitions === 0 ? 0 : 5,
      nextReview: new Date(Date.now() - 60000),
      createdAt: new Date("2026-01-01"),
      lastReviewedAt: repetitions === 0 ? null : new Date("2026-01-02"),
      kanji: {
        id: `k-${repetitions}-${i}`,
        character: "学",
        meanings: '["study"]',
        readingsOn: "[]",
        readingsKun: "[]",
        radicals: "[]",
        primitives: "[]",
        heisigNumber: null,
        heisigKeyword: null,
        heisigLesson: null,
      },
      customMeaning: null,
      mnemonic: null,
    });

    // Vocab offers 2 new cards and nothing else, so it falls short of its half
    // and kanji backfills. Kanji must not re-spend the allowance vocab used.
    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValue([vocab(0), vocab(1)] as never);
    vi.mocked(prisma.userKanji.findMany).mockResolvedValue([
      kanji(0, 0),
      ...Array.from({ length: 20 }, (_, i) => kanji(i + 1, 2)),
    ] as never);
    vi.mocked(prisma.userFlashcard.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.userKanji.count).mockResolvedValue(0 as never);

    const req = new Request(
      "http://localhost/api/review/mixed?studyMode=due&limit=10&newPerSession=3"
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    const newCards = data.cards.filter(
      (c: { repetitions?: number }) => (c.repetitions ?? 0) === 0
    );
    // 2 from vocab + at most 1 from the backfill. The old backfill passed the
    // full allowance again and produced 5.
    expect(newCards.length).toBe(3);
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
