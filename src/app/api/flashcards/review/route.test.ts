import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    userFlashcard: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    kanji: {
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

vi.mock("@/lib/srs", () => ({
  applyReview: vi.fn(),
}));

vi.mock("@/lib/fsrs/apply-review", () => ({
  applyFsrsReview: vi.fn(),
  buildReviewPersistData: vi.fn(),
  EarlyReviewStrategy: {
    PRACTICE: "practice",
    PROPORTIONAL: "proportional",
  },
}));

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { applyFsrsReview, buildReviewPersistData, type ReviewUpdatePayload } from "@/lib/fsrs/apply-review";

describe("Review API - GET", () => {
  const mockUser = { id: "user-123", email: "test@example.com" };

  beforeEach(() => {
    vi.clearAllMocks();
    // Word-kanji context is one batched lookup per page.
    vi.mocked(prisma.kanji.findMany).mockResolvedValue([]);
    vi.mocked(prisma.userKanji.findMany).mockResolvedValue([]);
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

    const req = new Request("http://localhost/api/flashcards/review");
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should fetch due cards by default", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    const now = new Date();
    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValueOnce([
      {
        id: "1",
        word: { dictionary: "猫", reading: "ねこ", meanings: '["cat"]', partOfSpeech: "noun" },
        userId: "user-123",
        repetitions: 0,
        easeFactor: 2.5,
        interval: 0,
        nextReview: now,
        createdAt: now,
      } as never,
    ]);

    const req = new Request("http://localhost/api/flashcards/review");
    const response = await GET(req);
    const data = await response.json();

    expect(data.cards).toHaveLength(1);
    expect(prisma.userFlashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-123",
          nextReview: { lte: expect.any(Date) },
        }),
      })
    );
  });

  it("attaches wordKanji for the whole page in one batched lookup", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    const now = new Date();
    const card = (id: string, dictionary: string, reading: string) => ({
      id,
      userId: "user-123",
      status: "learning",
      easeFactor: 2.5,
      repetitions: 2,
      interval: 4,
      nextReview: now,
      createdAt: now,
      word: {
        dictionary,
        reading,
        meanings: '["test"]',
        partOfSpeech: "noun",
      },
      wordForm: null,
      phrase: null,
    });

    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValueOnce([
      card("1", "今週", "こんしゅう"),
      card("2", "日本", "にほん"),
    ] as never);

    vi.mocked(prisma.kanji.findMany).mockResolvedValueOnce([
      { character: "今", heisigKeyword: "now", heisigNumber: 12, meanings: '["now"]' },
      { character: "週", heisigKeyword: "week", heisigNumber: 50, meanings: '["week"]' },
      { character: "日", heisigKeyword: "sun", heisigNumber: 13, meanings: '["day"]' },
      { character: "本", heisigKeyword: "origin", heisigNumber: 86, meanings: '["book"]' },
    ] as never);

    const response = await GET(
      new Request("http://localhost/api/flashcards/review?studyMode=all")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    const keywordsByWord = Object.fromEntries(
      data.cards.map((c: { word: string; wordKanji: { keyword: string }[] }) => [
        c.word,
        c.wordKanji.map((kanji) => kanji.keyword),
      ])
    );
    expect(keywordsByWord["今週"]).toEqual(["now", "week"]);
    expect(keywordsByWord["日本"]).toEqual(["sun", "origin"]);

    // Two words, four glyphs, still one IN query.
    expect(prisma.kanji.findMany).toHaveBeenCalledTimes(1);
    const lookup = vi.mocked(prisma.kanji.findMany).mock.calls[0][0] as
      | { where?: { character?: { in?: string[] } } }
      | undefined;
    expect([...(lookup?.where?.character?.in ?? [])].sort()).toEqual(
      ["今", "週", "日", "本"].sort()
    );
    expect(prisma.userKanji.findMany).toHaveBeenCalledTimes(1);
  });

  it("should prioritize oldest due cards before SRS timing", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValueOnce([]);

    await GET(new Request("http://localhost/api/flashcards/review"));

    expect(prisma.userFlashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ easeFactor: "asc" }, { repetitions: "asc" }, { createdAt: "asc" }],
      })
    );
  });

  it("should fetch cards with 'all' study mode (no nextReview filter)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/flashcards/review?studyMode=all");
    await GET(req);

    expect(prisma.userFlashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-123",
        },
        orderBy: [{ easeFactor: "asc" }, { repetitions: "asc" }, { createdAt: "asc" }],
        take: 200,
      })
    );
  });

  it("should fetch 'recent' cards (last 7 days)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/flashcards/review?studyMode=recent");
    await GET(req);

    expect(prisma.userFlashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-123",
          createdAt: { gte: expect.any(Date) },
        }),
        orderBy: [{ easeFactor: "asc" }, { repetitions: "asc" }, { createdAt: "asc" }],
        take: 200,
      })
    );
  });

  it("should fetch 'struggling' cards (low ease factor)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/flashcards/review?studyMode=struggling");
    await GET(req);

    expect(prisma.userFlashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-123",
          AND: [
            { OR: [{ difficulty: { gt: 7 } }, { difficulty: null, easeFactor: { lt: 2.0 } }] },
          ],
        }),
        orderBy: [{ easeFactor: "asc" }, { createdAt: "asc" }],
      })
    );
  });

  it("should fetch 'leeches' cards (many reviews, short interval)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/flashcards/review?studyMode=leeches");
    await GET(req);

    expect(prisma.userFlashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-123",
          AND: [
            { lapses: { gte: 3 } },
            { interval: { lt: 7 } },
          ],
        }),
        orderBy: [{ timesReviewed: "desc" }, { createdAt: "asc" }],
      })
    );
  });

  it("should apply status filter", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/flashcards/review?status=learning");
    await GET(req);

    expect(prisma.userFlashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-123",
          status: "learning",
        }),
      })
    );
  });

  it("should apply part of speech filter", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/flashcards/review?pos=verb");
    await GET(req);

    expect(prisma.userFlashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-123",
          OR: [
            { word: { is: { partOfSpeech: { equals: "verb" } } } },
            { phrase: { is: { partOfSpeech: { equals: "verb" } } } },
          ],
        }),
      })
    );
  });

  it("should apply JLPT level filter", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/flashcards/review?jlpt=N5");
    await GET(req);

    expect(prisma.userFlashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-123",
          OR: [
            { word: { is: { jlptLevel: { equals: "N5" } } } },
          ],
        }),
      })
    );
  });

  it("should ignore invalid JLPT levels", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/flashcards/review?jlpt=N99");
    await GET(req);

    expect(prisma.userFlashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-123",
          nextReview: { lte: expect.any(Date) },
        }),
      })
    );
  });

  it("should ignore invalid status values", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/flashcards/review?status=invalid");
    await GET(req);

    expect(prisma.userFlashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-123",
          nextReview: { lte: expect.any(Date) },
        },
      })
    );
  });

  it("should combine multiple filters", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValueOnce([]);

    const req = new Request(
      "http://localhost/api/flashcards/review?studyMode=due&status=learning&pos=verb&jlpt=N5"
    );
    await GET(req);

    expect(prisma.userFlashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-123",
          nextReview: { lte: expect.any(Date) },
          status: "learning",
          OR: [
            {
              word: {
                is: {
                  partOfSpeech: { equals: "verb" },
                  jlptLevel: { equals: "N5" },
                },
              },
            },
            {
              phrase: {
                is: {
                  partOfSpeech: { equals: "verb" },
                },
              },
            },
          ],
        }),
      })
    );
  });

  it("should respect limit parameter", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/flashcards/review?limit=10");
    await GET(req);

    expect(prisma.userFlashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 40, // limit * 4 for session composition
      })
    );
  });

  it("should cap limit at 200", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/flashcards/review?limit=999");
    await GET(req);

    expect(prisma.userFlashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 200,
      })
    );
  });

  it("should enforce minimum limit of 1", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/flashcards/review?limit=-5");
    await GET(req);

    expect(prisma.userFlashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 4, // 1 * 4 (minimum limit is 1)
      })
    );
  });

  it("should use default limit of 50 if not specified", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/flashcards/review");
    await GET(req);

    expect(prisma.userFlashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 200, // 50 * 4 (default limit is 50, capped at 200)
      })
    );
  });
});

describe("Review API - POST", () => {
  const mockUser = { id: "user-123", email: "test@example.com" };
  const mockCard = {
    id: "card-1",
    userId: "user-123",
    word: "猫",
    easeFactor: 2.5,
    interval: 1,
    repetitions: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Word-kanji context is one batched lookup per page.
    vi.mocked(prisma.kanji.findMany).mockResolvedValue([]);
    vi.mocked(prisma.userKanji.findMany).mockResolvedValue([]);
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

    const req = new Request("http://localhost/api/flashcards/review", {
      method: "POST",
      body: JSON.stringify({ cardId: "card-1", grade: 2 }),
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 for invalid JSON", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);

    const req = new Request("http://localhost/api/flashcards/review", {
      method: "POST",
      body: "invalid json",
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid body");
  });

  it("should return 400 for missing cardId", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);

    const req = new Request("http://localhost/api/flashcards/review", {
      method: "POST",
      body: JSON.stringify({ grade: 2 }),
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Missing cardId or grade");
  });

  it("should return 400 for missing grade", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);

    const req = new Request("http://localhost/api/flashcards/review", {
      method: "POST",
      body: JSON.stringify({ cardId: "card-1" }),
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Missing cardId or grade");
  });

  it("should return 400 for invalid grade (negative)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);

    const req = new Request("http://localhost/api/flashcards/review", {
      method: "POST",
      body: JSON.stringify({ cardId: "card-1", grade: -1 }),
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Missing cardId or grade");
  });

  it("should return 400 for invalid grade (too high)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);

    const req = new Request("http://localhost/api/flashcards/review", {
      method: "POST",
      body: JSON.stringify({ cardId: "card-1", grade: 5 }),
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Missing cardId or grade");
  });

  it("should return 404 if card not found", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.userFlashcard.findFirst).mockResolvedValueOnce(null);

    const req = new Request("http://localhost/api/flashcards/review", {
      method: "POST",
      body: JSON.stringify({ cardId: "card-999", grade: 2 }),
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Card not found.");
  });

  it("should successfully grade a card", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.userFlashcard.findFirst).mockResolvedValueOnce(mockCard as never);
    const fsrsResult: ReviewUpdatePayload = {
      easeFactor: 2.5,
      interval: 6,
      repetitions: 1,
      status: "learning",
      nextReview: new Date(),
      difficulty: 5,
      stability: 6,
      retrievability: 1.0,
      lastReviewedAt: new Date(),
      timesReviewedIncrement: 1,
      lapsesIncrement: 0,
    };
    vi.mocked(applyFsrsReview).mockReturnValueOnce(fsrsResult);
    const persistData = {
      easeFactor: 2.5,
      interval: 6,
      repetitions: 1,
      status: "learning",
      nextReview: fsrsResult.nextReview,
      difficulty: 5,
      stability: 6,
      retrievability: 1.0,
      lastReviewedAt: fsrsResult.lastReviewedAt,
      timesReviewed: { increment: 1 },
    };
    vi.mocked(buildReviewPersistData).mockReturnValueOnce(persistData as never);
    vi.mocked(prisma.userFlashcard.update).mockResolvedValueOnce({
      ...mockCard,
      ...persistData,
    } as never);

    const req = new Request("http://localhost/api/flashcards/review", {
      method: "POST",
      body: JSON.stringify({ cardId: "card-1", grade: 2 }),
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.card).toBeDefined();
    expect(applyFsrsReview).toHaveBeenCalledWith(
      expect.objectContaining({
        card: expect.objectContaining({
          id: "card-1",
          easeFactor: 2.5,
          interval: 1,
          repetitions: 0,
        }),
        grade: 2,
        cardType: "flashcard",
      })
    );
    expect(buildReviewPersistData).toHaveBeenCalledWith(fsrsResult);
    expect(prisma.userFlashcard.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "card-1" },
        data: expect.objectContaining({
          easeFactor: 2.5,
          interval: 6,
          repetitions: 1,
          status: "learning",
          difficulty: 5,
          stability: 6,
          retrievability: 1.0,
          timesReviewed: { increment: 1 },
        }),
      })
    );
  });

  it("should handle grade 0 (again)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.userFlashcard.findFirst).mockResolvedValueOnce(mockCard as never);
    vi.mocked(applyFsrsReview).mockReturnValueOnce({
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      status: "learning",
      nextReview: new Date(Date.now() + 10 * 60 * 1000),
      difficulty: 7,
      stability: 0.5,
      retrievability: 1.0,
      lastReviewedAt: new Date(),
      timesReviewedIncrement: 1,
      lapsesIncrement: 0,
    });
    vi.mocked(buildReviewPersistData).mockReturnValueOnce({
      timesReviewed: { increment: 1 },
      lastReviewedAt: expect.any(Date),
    } as never);
    vi.mocked(prisma.userFlashcard.update).mockResolvedValueOnce(mockCard as never);

    const req = new Request("http://localhost/api/flashcards/review", {
      method: "POST",
      body: JSON.stringify({ cardId: "card-1", grade: 0 }),
    });
    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(applyFsrsReview).toHaveBeenCalledWith(
      expect.objectContaining({ grade: 0 })
    );
  });

  it("should handle grade 3 (easy)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.userFlashcard.findFirst).mockResolvedValueOnce(mockCard as never);
    vi.mocked(applyFsrsReview).mockReturnValueOnce({
      easeFactor: 2.8,
      interval: 15,
      repetitions: 1,
      status: "learning",
      nextReview: new Date(),
      difficulty: 3.5,
      stability: 15,
      retrievability: 1.0,
      lastReviewedAt: new Date(),
      timesReviewedIncrement: 1,
      lapsesIncrement: 0,
    });
    vi.mocked(buildReviewPersistData).mockReturnValueOnce({
      timesReviewed: { increment: 1 },
      lastReviewedAt: expect.any(Date),
    } as never);
    vi.mocked(prisma.userFlashcard.update).mockResolvedValueOnce(mockCard as never);

    const req = new Request("http://localhost/api/flashcards/review", {
      method: "POST",
      body: JSON.stringify({ cardId: "card-1", grade: 3 }),
    });
    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(applyFsrsReview).toHaveBeenCalledWith(
      expect.objectContaining({ grade: 3 })
    );
  });

  it("should increment timesReviewed counter", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.userFlashcard.findFirst).mockResolvedValueOnce(mockCard as never);
    vi.mocked(applyFsrsReview).mockReturnValueOnce({
      easeFactor: 2.5,
      interval: 6,
      repetitions: 1,
      status: "learning",
      nextReview: new Date(),
      difficulty: 5,
      stability: 6,
      retrievability: 1.0,
      lastReviewedAt: new Date(),
      timesReviewedIncrement: 1,
      lapsesIncrement: 0,
    });
    vi.mocked(buildReviewPersistData).mockReturnValueOnce({
      easeFactor: 2.5,
      interval: 6,
      repetitions: 1,
      status: "learning",
      nextReview: new Date(),
      difficulty: 5,
      stability: 6,
      retrievability: 1.0,
      timesReviewed: { increment: 1 },
      lastReviewedAt: new Date(),
    } as never);
    vi.mocked(prisma.userFlashcard.update).mockResolvedValueOnce(mockCard as never);

    const req = new Request("http://localhost/api/flashcards/review", {
      method: "POST",
      body: JSON.stringify({ cardId: "card-1", grade: 2 }),
    });
    await POST(req);

    expect(prisma.userFlashcard.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          timesReviewed: { increment: 1 },
          lastReviewedAt: expect.any(Date),
        }),
      })
    );
  });

  it("should prevent grading cards from other users", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.userFlashcard.findFirst).mockResolvedValueOnce(null);

    const req = new Request("http://localhost/api/flashcards/review", {
      method: "POST",
      body: JSON.stringify({ cardId: "other-user-card", grade: 2 }),
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Card not found.");
    expect(prisma.userFlashcard.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "other-user-card", userId: "user-123" },
      })
    );
  });
});

describe("Reviews-only due sessions — lapsed cards", () => {
  const mockUser = { id: "user-123", email: "test@example.com" };

  beforeEach(() => {
    vi.clearAllMocks();
    // Word-kanji context is one batched lookup per page.
    vi.mocked(prisma.kanji.findMany).mockResolvedValue([]);
    vi.mocked(prisma.userKanji.findMany).mockResolvedValue([]);
  });

  it("keeps lapsed cards instead of filtering repetitions > 0", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValueOnce([]);

    const req = new Request(
      "http://localhost/api/flashcards/review?studyMode=due&learningRatio=0"
    );
    await GET(req);

    expect(prisma.userFlashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-123",
          AND: [{ OR: [{ repetitions: { gt: 0 } }, { timesReviewed: { gt: 0 } }] }],
        }),
      })
    );

    const where = vi.mocked(prisma.userFlashcard.findMany).mock.calls[0][0]
      ?.where as unknown as Record<string, unknown>;
    // A bare `repetitions > 0` filter hides lapsed cards; it must not be used.
    expect(where).not.toHaveProperty("repetitions");
  });
});

describe("Daily review ceiling", () => {
  const mockUser = { id: "user-123", email: "test@example.com", timezone: "UTC" };

  const dueCard = (i: number) => ({
    id: `card-${i}`,
    userId: "user-123",
    status: "learning",
    easeFactor: 2.5,
    repetitions: 2,
    timesReviewed: 2,
    interval: 5,
    nextReview: new Date(Date.now() - 60_000),
    lastReviewedAt: new Date(Date.now() - 3 * 86_400_000),
    createdAt: new Date("2026-01-01"),
    word: { dictionary: `語${i}`, reading: "ご", meanings: '["word"]', partOfSpeech: "noun" },
    wordForm: null,
    phrase: null,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Word-kanji context is one batched lookup per page.
    vi.mocked(prisma.kanji.findMany).mockResolvedValue([]);
    vi.mocked(prisma.userKanji.findMany).mockResolvedValue([]);
  });

  it("shrinks the session to what is left of today's ceiling", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.userFlashcard.count).mockResolvedValueOnce(7);
    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValueOnce(
      Array.from({ length: 10 }, (_, i) => dueCard(i)) as never
    );

    const res = await GET(
      new Request("http://localhost/api/flashcards/review?limit=10&maxDailyReviews=10")
    );
    const data = await res.json();

    // 10-card ceiling, 7 already reviewed today → at most 3 cards.
    expect(data.cards.length).toBeLessThanOrEqual(3);
    expect(data.cards.length).toBeGreaterThan(0);
  });

  it("serves nothing once the ceiling is used up", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.userFlashcard.count).mockResolvedValueOnce(10);
    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValueOnce(
      Array.from({ length: 10 }, (_, i) => dueCard(i)) as never
    );

    const res = await GET(
      new Request("http://localhost/api/flashcards/review?limit=10&maxDailyReviews=10")
    );

    expect(await res.json()).toEqual({ cards: [] });
    expect(prisma.userFlashcard.findMany).not.toHaveBeenCalled();
  });

  it("ignores the ceiling when the setting is absent", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.userFlashcard.findMany).mockResolvedValueOnce([]);

    await GET(new Request("http://localhost/api/flashcards/review?limit=10"));

    expect(prisma.userFlashcard.count).not.toHaveBeenCalled();
    expect(prisma.userFlashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 40 })
    );
  });
});
