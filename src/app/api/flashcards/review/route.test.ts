import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    flashcard: {
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

describe("Review API - GET", () => {
  const mockUser = { id: "user-123", email: "test@example.com" };

  beforeEach(() => {
    vi.clearAllMocks();
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
    vi.mocked(prisma.flashcard.findMany).mockResolvedValueOnce([
      { id: "1", word: "猫", userId: "user-123" } as never,
    ]);

    const req = new Request("http://localhost/api/flashcards/review");
    const response = await GET(req);
    const data = await response.json();

    expect(data.cards).toHaveLength(1);
    expect(prisma.flashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-123",
          nextReview: { lte: expect.any(Date) },
        }),
      })
    );
  });

  it("should fetch cards with 'all' study mode (no nextReview filter)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.flashcard.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/flashcards/review?studyMode=all");
    await GET(req);

    expect(prisma.flashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-123",
        },
        orderBy: { createdAt: "desc" },
      })
    );
  });

  it("should fetch 'recent' cards (last 7 days)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.flashcard.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/flashcards/review?studyMode=recent");
    await GET(req);

    expect(prisma.flashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-123",
          createdAt: { gte: expect.any(Date) },
        }),
        orderBy: { createdAt: "desc" },
      })
    );
  });

  it("should fetch 'struggling' cards (low ease factor)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.flashcard.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/flashcards/review?studyMode=struggling");
    await GET(req);

    expect(prisma.flashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-123",
          easeFactor: { lt: 2.0 },
        }),
        orderBy: { easeFactor: "asc" },
      })
    );
  });

  it("should fetch 'leeches' cards (many reviews, short interval)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.flashcard.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/flashcards/review?studyMode=leeches");
    await GET(req);

    expect(prisma.flashcard.findMany).toHaveBeenCalledWith(
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

  it("should apply status filter", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.flashcard.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/flashcards/review?status=learning");
    await GET(req);

    expect(prisma.flashcard.findMany).toHaveBeenCalledWith(
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
    vi.mocked(prisma.flashcard.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/flashcards/review?pos=verb");
    await GET(req);

    expect(prisma.flashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-123",
          partOfSpeech: "verb",
        }),
      })
    );
  });

  it("should apply JLPT level filter", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.flashcard.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/flashcards/review?jlpt=N5");
    await GET(req);

    expect(prisma.flashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-123",
          jlptTier: "N5",
        }),
      })
    );
  });

  it("should ignore invalid JLPT levels", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.flashcard.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/flashcards/review?jlpt=N99");
    await GET(req);

    expect(prisma.flashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-123",
          nextReview: { lte: expect.any(Date) },
        },
      })
    );
  });

  it("should ignore invalid status values", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.flashcard.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/flashcards/review?status=invalid");
    await GET(req);

    expect(prisma.flashcard.findMany).toHaveBeenCalledWith(
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
    vi.mocked(prisma.flashcard.findMany).mockResolvedValueOnce([]);

    const req = new Request(
      "http://localhost/api/flashcards/review?studyMode=due&status=learning&pos=verb&jlpt=N5"
    );
    await GET(req);

    expect(prisma.flashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-123",
          nextReview: { lte: expect.any(Date) },
          status: "learning",
          partOfSpeech: "verb",
          jlptTier: "N5",
        }),
      })
    );
  });

  it("should respect limit parameter", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.flashcard.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/flashcards/review?limit=10");
    await GET(req);

    expect(prisma.flashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
      })
    );
  });

  it("should cap limit at 200", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.flashcard.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/flashcards/review?limit=999");
    await GET(req);

    expect(prisma.flashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 200,
      })
    );
  });

  it("should enforce minimum limit of 1", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.flashcard.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/flashcards/review?limit=-5");
    await GET(req);

    expect(prisma.flashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 1,
      })
    );
  });

  it("should use default limit of 50 if not specified", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.flashcard.findMany).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/flashcards/review");
    await GET(req);

    expect(prisma.flashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
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
    vi.mocked(prisma.flashcard.findFirst).mockResolvedValueOnce(null);

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
    vi.mocked(prisma.flashcard.findFirst).mockResolvedValueOnce(mockCard as never);
    vi.mocked(applyReview).mockReturnValueOnce({
      easeFactor: 2.6,
      interval: 6,
      repetitions: 1,
      status: "learning",
      nextReview: new Date(),
    });
    vi.mocked(prisma.flashcard.update).mockResolvedValueOnce({
      ...mockCard,
      easeFactor: 2.6,
      interval: 6,
      repetitions: 1,
    } as never);

    const req = new Request("http://localhost/api/flashcards/review", {
      method: "POST",
      body: JSON.stringify({ cardId: "card-1", grade: 2 }),
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
    expect(prisma.flashcard.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "card-1" },
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

  it("should handle grade 0 (again)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.flashcard.findFirst).mockResolvedValueOnce(mockCard as never);
    vi.mocked(applyReview).mockReturnValueOnce({
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      status: "learning",
      nextReview: new Date(Date.now() + 10 * 60 * 1000),
    });
    vi.mocked(prisma.flashcard.update).mockResolvedValueOnce(mockCard as never);

    const req = new Request("http://localhost/api/flashcards/review", {
      method: "POST",
      body: JSON.stringify({ cardId: "card-1", grade: 0 }),
    });
    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(applyReview).toHaveBeenCalledWith(expect.anything(), 0);
  });

  it("should handle grade 3 (easy)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.flashcard.findFirst).mockResolvedValueOnce(mockCard as never);
    vi.mocked(applyReview).mockReturnValueOnce({
      easeFactor: 2.8,
      interval: 6,
      repetitions: 1,
      status: "learning",
      nextReview: new Date(),
    });
    vi.mocked(prisma.flashcard.update).mockResolvedValueOnce(mockCard as never);

    const req = new Request("http://localhost/api/flashcards/review", {
      method: "POST",
      body: JSON.stringify({ cardId: "card-1", grade: 3 }),
    });
    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(applyReview).toHaveBeenCalledWith(expect.anything(), 3);
  });

  it("should increment timesReviewed counter", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser as never);
    vi.mocked(prisma.flashcard.findFirst).mockResolvedValueOnce(mockCard as never);
    vi.mocked(applyReview).mockReturnValueOnce({
      easeFactor: 2.6,
      interval: 6,
      repetitions: 1,
      status: "learning",
      nextReview: new Date(),
    });
    vi.mocked(prisma.flashcard.update).mockResolvedValueOnce(mockCard as never);

    const req = new Request("http://localhost/api/flashcards/review", {
      method: "POST",
      body: JSON.stringify({ cardId: "card-1", grade: 2 }),
    });
    await POST(req);

    expect(prisma.flashcard.update).toHaveBeenCalledWith(
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
    vi.mocked(prisma.flashcard.findFirst).mockResolvedValueOnce(null);

    const req = new Request("http://localhost/api/flashcards/review", {
      method: "POST",
      body: JSON.stringify({ cardId: "other-user-card", grade: 2 }),
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Card not found.");
    expect(prisma.flashcard.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "other-user-card", userId: "user-123" },
      })
    );
  });
});
