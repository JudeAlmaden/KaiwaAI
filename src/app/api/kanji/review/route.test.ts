import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    userKanji: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/srs", () => ({
  applyReview: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { applyReview } from "@/lib/srs";

describe("Kanji Review API - GET", () => {
  const mockUser = { id: "user-123", email: "test@example.com" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

    const req = new Request("http://localhost/api/kanji/review");
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should fetch due kanji by default", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser);
    vi.mocked(prisma.userKanji.findMany).mockResolvedValueOnce([
      {
        id: "uk1",
        userId: "user-123",
        kanjiId: "k1",
        status: "learning",
        easeFactor: 2.5,
        interval: 1,
        repetitions: 1,
        timesReviewed: 1,
        nextReview: new Date(),
        lastReviewedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        kanji: {
          id: "k1",
          character: "猫",
          meanings: '["cat"]',
          readingsOn: '["びょう"]',
          readingsKun: '["ねこ"]',
          strokes: 11,
          grade: null,
          frequency: 100,
          jlptLevel: 5,
          radicals: '["犭","苗"]',
          wkLevel: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as never,
    ]);

    const req = new Request("http://localhost/api/kanji/review");
    const response = await GET(req);
    const data = await response.json();

    expect(data.cards).toHaveLength(1);
    expect(data.cards[0].character).toBe("猫");
    expect(data.cards[0].meanings).toEqual(["cat"]);
  });

  it("should handle all study modes", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser);
    vi.mocked(prisma.userKanji.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/kanji/review?studyMode=all");
    await GET(req);

    expect(prisma.userKanji.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-123" },
        orderBy: { createdAt: "desc" },
      })
    );
  });

  it("should handle recent study mode", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser);
    vi.mocked(prisma.userKanji.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/kanji/review?studyMode=recent");
    await GET(req);

    expect(prisma.userKanji.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-123",
          createdAt: { gte: expect.any(Date) },
        }),
      })
    );
  });

  it("should handle struggling study mode", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser);
    vi.mocked(prisma.userKanji.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/kanji/review?studyMode=struggling");
    await GET(req);

    expect(prisma.userKanji.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-123",
          easeFactor: { lt: 2.0 },
        }),
        orderBy: { easeFactor: "asc" },
      })
    );
  });

  it("should handle leeches study mode", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser);
    vi.mocked(prisma.userKanji.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/kanji/review?studyMode=leeches");
    await GET(req);

    expect(prisma.userKanji.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-123",
          AND: [
            { timesReviewed: { gte: 8 } },
            { interval: { lt: 7 } },
          ],
        }),
        orderBy: { timesReviewed: "desc" },
      })
    );
  });

  it("should respect limit parameter", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser);
    vi.mocked(prisma.userKanji.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/kanji/review?limit=10");
    await GET(req);

    expect(prisma.userKanji.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
      })
    );
  });

  it("should cap limit at 200", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser);
    vi.mocked(prisma.userKanji.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/kanji/review?limit=999");
    await GET(req);

    expect(prisma.userKanji.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 200,
      })
    );
  });
});

describe("Kanji Review API - POST", () => {
  const mockUser = { id: "user-123", email: "test@example.com" };
  const mockUserKanji = {
    id: "uk1",
    userId: "user-123",
    kanjiId: "k1",
    status: "learning",
    easeFactor: 2.5,
    interval: 1,
    repetitions: 0,
    timesReviewed: 0,
    nextReview: new Date(),
    lastReviewedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

    const req = new Request("http://localhost/api/kanji/review", {
      method: "POST",
      body: JSON.stringify({ cardId: "uk1", grade: 2 }),
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 for invalid JSON", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser);

    const req = new Request("http://localhost/api/kanji/review", {
      method: "POST",
      body: "invalid json",
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid body");
  });

  it("should return 400 for missing cardId", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser);

    const req = new Request("http://localhost/api/kanji/review", {
      method: "POST",
      body: JSON.stringify({ grade: 2 }),
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Missing cardId or grade");
  });

  it("should return 400 for invalid grade", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser);

    const req = new Request("http://localhost/api/kanji/review", {
      method: "POST",
      body: JSON.stringify({ cardId: "uk1", grade: 5 }),
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Missing cardId or grade");
  });

  it("should return 404 if card not found", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser);
    vi.mocked(prisma.userKanji.findFirst).mockResolvedValueOnce(null);

    const req = new Request("http://localhost/api/kanji/review", {
      method: "POST",
      body: JSON.stringify({ cardId: "uk999", grade: 2 }),
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Card not found.");
  });

  it("should successfully grade a kanji card", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser);
    vi.mocked(prisma.userKanji.findFirst).mockResolvedValueOnce(mockUserKanji as never);
    vi.mocked(applyReview).mockReturnValueOnce({
      easeFactor: 2.6,
      interval: 6,
      repetitions: 1,
      status: "learning",
      nextReview: new Date(),
    });
    vi.mocked(prisma.userKanji.update).mockResolvedValueOnce({
      ...mockUserKanji,
      easeFactor: 2.6,
      interval: 6,
      repetitions: 1,
    } as never);

    const req = new Request("http://localhost/api/kanji/review", {
      method: "POST",
      body: JSON.stringify({ cardId: "uk1", grade: 2 }),
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.card).toBeDefined();
    expect(applyReview).toHaveBeenCalledWith(
      {
        easeFactor: 2.5,
        interval: 1,
        repetitions: 0,
      },
      2
    );
    expect(prisma.userKanji.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "uk1" },
        data: expect.objectContaining({
          easeFactor: 2.6,
          interval: 6,
          repetitions: 1,
          status: "learning",
          timesReviewed: { increment: 1 },
        }),
      })
    );
  });

  it("should handle all grade values", async () => {
    for (const grade of [0, 1, 2, 3]) {
      vi.clearAllMocks();
      vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.userKanji.findFirst).mockResolvedValueOnce(mockUserKanji as never);
      vi.mocked(applyReview).mockReturnValueOnce({
        easeFactor: 2.5,
        interval: grade === 0 ? 0 : 6,
        repetitions: grade === 0 ? 0 : 1,
        status: "learning",
        nextReview: new Date(),
      });
      vi.mocked(prisma.userKanji.update).mockResolvedValueOnce(mockUserKanji as never);

      const req = new Request("http://localhost/api/kanji/review", {
        method: "POST",
        body: JSON.stringify({ cardId: "uk1", grade }),
      });
      const response = await POST(req);

      expect(response.status).toBe(200);
      expect(applyReview).toHaveBeenCalledWith(expect.anything(), grade);
    }
  });

  it("should prevent grading other users kanji", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser);
    vi.mocked(prisma.userKanji.findFirst).mockResolvedValueOnce(null);

    const req = new Request("http://localhost/api/kanji/review", {
      method: "POST",
      body: JSON.stringify({ cardId: "other-user-kanji", grade: 2 }),
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Card not found.");
    expect(prisma.userKanji.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "other-user-kanji", userId: "user-123" },
      })
    );
  });
});
