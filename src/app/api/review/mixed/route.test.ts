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
    kanji: {
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
    // reset (not clear): the new-card tests install persistent implementations
    // that must not leak into the next test.
    vi.resetAllMocks();
    // Component context resolution is a second, batched lookup per render.
    vi.mocked(prisma.kanji.findMany).mockResolvedValue([]);
    vi.mocked(prisma.userKanji.findMany).mockResolvedValue([]);
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

  it("attaches wordKanji with resolved keywords from one batched lookup", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);

    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValueOnce([
      {
        id: "uf-words",
        userId: "user-123",
        status: "learning",
        easeFactor: 2.5,
        repetitions: 1,
        interval: 3,
        nextReview: new Date(Date.now() - 10000),
        createdAt: new Date("2026-01-01"),
        word: {
          id: "w-1",
          dictionary: "今週",
          reading: "こんしゅう",
          meanings: '["this week"]',
          partOfSpeech: "noun",
        },
        wordForm: null,
        phrase: null,
      },
    ] as never);

    // First call: kanji cards for this session (none). Second: the single
    // override lookup that belongs to the batched component resolution.
    vi.mocked(prisma.userKanji.findMany)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([
        { customMeaning: null, mnemonic: null, kanji: { character: "週" } },
      ] as never);

    vi.mocked(prisma.kanji.findMany).mockResolvedValueOnce([
      { character: "今", heisigKeyword: "now", heisigNumber: 12, meanings: '["now"]' },
      { character: "週", heisigKeyword: "week", heisigNumber: 50, meanings: '["week"]' },
    ] as never);

    const req = new Request("http://localhost/api/review/mixed?studyMode=due&limit=10");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    const vocabCard = data.cards.find((c: { type: string }) => c.type === "vocabulary");
    expect(vocabCard.wordKanji).toEqual([
      expect.objectContaining({ glyph: "今", keyword: "now", heisigNumber: 12, inDictionary: true }),
      expect.objectContaining({ glyph: "週", keyword: "week", heisigNumber: 50, inDictionary: true }),
    ]);

    // One IN query for the whole page, not one per glyph or per card.
    expect(prisma.kanji.findMany).toHaveBeenCalledTimes(1);
    const lookup = vi.mocked(prisma.kanji.findMany).mock.calls[0][0] as
      | { where?: { character?: { in?: string[] } } }
      | undefined;
    expect(lookup?.where?.character?.in).toEqual(["今", "週"]);
    // Session queries may run more than once, but component overrides are
    // fetched once for the whole page, regardless of word count.
    const overrideLookups = vi
      .mocked(prisma.userKanji.findMany)
      .mock.calls.filter(([args]) => Boolean(args?.where?.kanji));
    expect(overrideLookups).toHaveLength(1);
    const overrideWhere = overrideLookups[0][0]?.where as
      | { kanji?: { character?: { in?: string[] } } }
      | undefined;
    expect(overrideWhere?.kanji?.character?.in).toEqual(["今", "週"]);
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
          AND: [
            { OR: [{ difficulty: { gt: 7 } }, { difficulty: null, easeFactor: { lt: 2.0 } }] },
          ],
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

  it("gives the whole new-card allowance to the pool that has the new cards", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser as never);

    const vocab = Array.from({ length: 8 }, (_, i) => ({
      id: `uf-review-${i}`,
      userId: "user-123",
      status: "learning",
      easeFactor: 2.5,
      repetitions: 2,
      interval: 4,
      timesReviewed: 3,
      nextReview: new Date(Date.now() - 60000),
      lastReviewedAt: new Date(Date.now() - 86400000),
      createdAt: new Date("2026-01-01"),
      word: {
        id: `w-${i}`,
        dictionary: `言葉${i}`,
        reading: "ことば",
        meanings: '["word"]',
        partOfSpeech: "noun",
      },
      wordForm: null,
      phrase: null,
    }));

    const kanjiNew = Array.from({ length: 4 }, (_, i) => ({
      id: `uk-new-${i}`,
      userId: "user-123",
      status: "learning",
      easeFactor: 2.5,
      repetitions: 0,
      interval: 0,
      timesReviewed: 0,
      nextReview: new Date(Date.now() - 60000),
      lastReviewedAt: null,
      createdAt: new Date("2026-01-01"),
      kanji: {
        id: `k-${i}`,
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
    }));

    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValue(vocab as never);
    vi.mocked(prisma.userKanji.findMany).mockResolvedValue(kanjiNew as never);
    vi.mocked(prisma.userFlashcard.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.userKanji.count).mockResolvedValue(0 as never);

    const res = await GET(
      new Request(
        "http://localhost/api/review/mixed?studyMode=due&limit=50&newPerSession=3&maxNewCards=20&learningRatio=0.5"
      )
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    // 8 reviews + all 3 allowed new cards. Splitting the allowance per deck
    // used to strand vocab's 2-card share and open a 9-card session.
    expect(data.cards).toHaveLength(11);
    const newCards = data.cards.filter(
      (c: { repetitions?: number }) => (c.repetitions ?? 0) === 0
    );
    expect(newCards).toHaveLength(3);
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

describe("Reviews-only due sessions — lapsed cards (mixed)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fills a blocked session with new cards, then study-ahead cards", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce({
      id: "user-123",
      email: "test@example.com",
      timezone: "UTC",
    } as never);
    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValue([]);
    vi.mocked(prisma.userKanji.findMany).mockResolvedValue([]);

    const res = await GET(
      new Request("http://localhost/api/review/mixed?studyMode=due&learningRatio=0&limit=10&fill=1")
    );
    expect(res.status).toBe(200);

    const studied = [{ OR: [{ repetitions: { gt: 0 } }, { timesReviewed: { gt: 0 } }] }];
    const vocabWhere = vi.mocked(prisma.userFlashcard.findMany).mock.calls[0][0]
      ?.where as unknown as Record<string, unknown>;
    const kanjiWhere = vi.mocked(prisma.userKanji.findMany).mock.calls[0][0]
      ?.where as unknown as Record<string, unknown>;

    // The reviews-only pool still excludes never-studied cards.
    expect(vocabWhere.AND).toEqual(studied);
    expect(kanjiWhere.AND).toEqual(studied);
    expect(vocabWhere).not.toHaveProperty("repetitions");
    expect(kanjiWhere).not.toHaveProperty("repetitions");

    // The pool came back empty, so new cards and then study-ahead cards are
    // merged in to reach the goal instead of ending the session short.
    expect(vi.mocked(prisma.userFlashcard.findMany)).toHaveBeenCalledTimes(3);
    expect(vi.mocked(prisma.userKanji.findMany)).toHaveBeenCalledTimes(3);
    const freshWhere = vi.mocked(prisma.userFlashcard.findMany).mock.calls[1][0]
      ?.where as unknown as Record<string, unknown>;
    expect(freshWhere.repetitions).toBe(0);
    expect(freshWhere.timesReviewed).toBe(0);
    const aheadWhere = vi.mocked(prisma.userFlashcard.findMany).mock.calls[2][0]
      ?.where as unknown as Record<string, unknown>;
    expect(aheadWhere.nextReview).toEqual({ gt: expect.any(Date) });
    expect(aheadWhere.AND).toEqual(studied);
  });
});
