import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { getCurrentUser } from "@/lib/auth-helpers";
import { currentStreak } from "@/lib/streak";
import type { User } from "@/generated/prisma";

vi.mock("@/lib/auth-helpers");
vi.mock("@/lib/streak");

vi.mock("@/lib/prisma", () => ({
  prisma: {
    flashcard: {
      count: vi.fn(),
    },
    message: {
      count: vi.fn(),
    },
    userKanji: {
      count: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

describe("/api/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns stats with level progression", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user1",
      email: "test@example.com",
      name: "Test User",
      level: "N5",
      timezone: "UTC",
      streakCount: 5,
      streakBestCount: 10,
      lastStreakDay: "2026-07-05",
    } as Partial<User> as User);

    vi.mocked(currentStreak).mockReturnValue(5);

    // Mock counts: 30 known words, 10 learning words, 5 new words
    // 20 known kanji, 5 learning kanji, 3 new kanji
    // Total mastered: 30 + 20 = 50 (should be "Elementary" level at 0% progress)
    vi.mocked(prisma.flashcard.count)
      .mockResolvedValueOnce(30) // known
      .mockResolvedValueOnce(10) // learning
      .mockResolvedValueOnce(5) // new
      .mockResolvedValueOnce(15); // due now

    vi.mocked(prisma.message.count).mockResolvedValueOnce(42);

    vi.mocked(prisma.userKanji.count)
      .mockResolvedValueOnce(20) // known
      .mockResolvedValueOnce(5) // learning
      .mockResolvedValueOnce(3); // new

    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toMatchObject({
      name: "Test User",
      level: "N5",
      progressLevel: "Elementary",
      progress: 0,
      nextMilestone: 150,
      masteredCount: 50,
      streak: 5,
      bestStreak: 10,
      vocab: { known: 30, learning: 10, new: 5, total: 45 },
      kanji: { known: 20, learning: 5, new: 3, total: 28 },
      dueNow: 15,
      messagesSent: 42,
    });
  });

  it("calculates Beginner level correctly", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user1",
      email: "test@example.com",
      name: "Test",
      level: "N5",
      timezone: "UTC",
      streakCount: 0,
      streakBestCount: 0,
      lastStreakDay: null,
    } as Partial<User> as User);

    vi.mocked(currentStreak).mockReturnValue(0);

    // 10 known words, 5 known kanji = 15 total (Beginner: 0-50)
    vi.mocked(prisma.flashcard.count)
      .mockResolvedValueOnce(10) // known
      .mockResolvedValueOnce(5) // learning
      .mockResolvedValueOnce(2) // new
      .mockResolvedValueOnce(0); // due

    vi.mocked(prisma.message.count).mockResolvedValueOnce(10);

    vi.mocked(prisma.userKanji.count)
      .mockResolvedValueOnce(5) // known
      .mockResolvedValueOnce(2) // learning
      .mockResolvedValueOnce(1); // new

    const res = await GET();
    const json = await res.json();

    expect(json.progressLevel).toBe("Beginner");
    expect(json.masteredCount).toBe(15);
    expect(json.progress).toBe(30); // 15/50 = 30%
    expect(json.nextMilestone).toBe(50);
  });

  it("calculates Intermediate level correctly", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user1",
      email: "test@example.com",
      name: "Test",
      level: "N4",
      timezone: "UTC",
      streakCount: 0,
      streakBestCount: 0,
      lastStreakDay: null,
    } as Partial<User> as User);

    vi.mocked(currentStreak).mockReturnValue(0);

    // 150 known words, 50 known kanji = 200 total (Intermediate: 150-300)
    vi.mocked(prisma.flashcard.count)
      .mockResolvedValueOnce(150) // known
      .mockResolvedValueOnce(20) // learning
      .mockResolvedValueOnce(10) // new
      .mockResolvedValueOnce(5); // due

    vi.mocked(prisma.message.count).mockResolvedValueOnce(100);

    vi.mocked(prisma.userKanji.count)
      .mockResolvedValueOnce(50) // known
      .mockResolvedValueOnce(10) // learning
      .mockResolvedValueOnce(5); // new

    const res = await GET();
    const json = await res.json();

    expect(json.progressLevel).toBe("Intermediate");
    expect(json.masteredCount).toBe(200);
    expect(json.progress).toBe(33); // (200-150)/(300-150) = 50/150 = 33%
    expect(json.nextMilestone).toBe(300);
  });

  it("calculates Advanced level correctly", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user1",
      email: "test@example.com",
      name: "Test",
      level: "N2",
      timezone: "UTC",
      streakCount: 0,
      streakBestCount: 0,
      lastStreakDay: null,
    } as Partial<User> as User);

    vi.mocked(currentStreak).mockReturnValue(0);

    // 500 known words, 200 known kanji = 700 total (Advanced: 600-1000)
    vi.mocked(prisma.flashcard.count)
      .mockResolvedValueOnce(500) // known
      .mockResolvedValueOnce(50) // learning
      .mockResolvedValueOnce(20) // new
      .mockResolvedValueOnce(10); // due

    vi.mocked(prisma.message.count).mockResolvedValueOnce(500);

    vi.mocked(prisma.userKanji.count)
      .mockResolvedValueOnce(200) // known
      .mockResolvedValueOnce(30) // learning
      .mockResolvedValueOnce(10); // new

    const res = await GET();
    const json = await res.json();

    expect(json.progressLevel).toBe("Advanced");
    expect(json.masteredCount).toBe(700);
    expect(json.progress).toBe(25); // (700-600)/(1000-600) = 100/400 = 25%
    expect(json.nextMilestone).toBe(1000);
  });

  it("calculates Native-like level correctly", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user1",
      email: "test@example.com",
      name: "Test",
      level: "N1",
      timezone: "UTC",
      streakCount: 0,
      streakBestCount: 0,
      lastStreakDay: null,
    } as Partial<User> as User);

    vi.mocked(currentStreak).mockReturnValue(0);

    // 2000 known words, 1000 known kanji = 3000 total (Native-like: 2500+)
    vi.mocked(prisma.flashcard.count)
      .mockResolvedValueOnce(2000) // known
      .mockResolvedValueOnce(100) // learning
      .mockResolvedValueOnce(50) // new
      .mockResolvedValueOnce(20); // due

    vi.mocked(prisma.message.count).mockResolvedValueOnce(1000);

    vi.mocked(prisma.userKanji.count)
      .mockResolvedValueOnce(1000) // known
      .mockResolvedValueOnce(50) // learning
      .mockResolvedValueOnce(20); // new

    const res = await GET();
    const json = await res.json();

    expect(json.progressLevel).toBe("Native-like");
    expect(json.masteredCount).toBe(3000);
    expect(json.progress).toBe(100); // Max level
    expect(json.nextMilestone).toBe(2500); // Min of current bracket
  });
});
