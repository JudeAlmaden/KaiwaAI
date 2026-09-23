import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { dayKeyFor, previousDayKey } from "@/lib/day";
import { currentStreak } from "@/lib/streak";
import type { User } from "@/generated/prisma/client";

export type DashboardStats = {
  name: string | null;
  level: string;
  progressLevel: string;
  progress: number;
  nextMilestone: number;
  masteredCount: number;
  streak: number;
  bestStreak: number;
  activeToday: boolean;
  vocab: { known: number; learning: number; new: number; total: number };
  kanji: { known: number; learning: number; new: number; total: number };
  dueNow: number;
  messagesSent: number;
};

function calculateLevel(masteredCount: number): {
  level: string;
  progress: number;
  nextMilestone: number;
} {
  const milestones = [
    { level: "Beginner", min: 0, max: 50 },
    { level: "Elementary", min: 50, max: 150 },
    { level: "Intermediate", min: 150, max: 300 },
    { level: "Upper Intermediate", min: 300, max: 600 },
    { level: "Advanced", min: 600, max: 1000 },
    { level: "Expert", min: 1000, max: 1500 },
    { level: "Master", min: 1500, max: 2500 },
    { level: "Native-like", min: 2500, max: Infinity },
  ];

  const current =
    milestones.find((m) => masteredCount >= m.min && masteredCount < m.max) ||
    milestones[milestones.length - 1];

  const levelRange = current.max - current.min;
  const levelProgress = masteredCount - current.min;
  const progress =
    levelRange === Infinity ? 100 : Math.min(100, Math.floor((levelProgress / levelRange) * 100));

  return {
    level: current.level,
    progress,
    nextMilestone: current.max === Infinity ? current.min : current.max,
  };
}

/** Home dashboard stats — deduped per request when wrapped in cache(). */
export const getDashboardStatsForUser = cache(async (user: User): Promise<DashboardStats> => {
  const now = new Date();
  const todayKey = dayKeyFor(now, user.timezone);
  const yesterdayKey = previousDayKey(todayKey);

  const [known, learning, neww, dueNow, totalMessages, kanjiKnown, kanjiLearning, kanjiNew] =
    await Promise.all([
      prisma.userFlashcard.count({ where: { userId: user.id, status: "known" } }),
      prisma.userFlashcard.count({ where: { userId: user.id, status: "learning" } }),
      prisma.userFlashcard.count({ where: { userId: user.id, status: "new" } }),
      prisma.userFlashcard.count({
        where: { userId: user.id, nextReview: { lte: now } },
      }),
      prisma.message.count({ where: { senderUserId: user.id, senderKind: "user" } }),
      prisma.userKanji.count({ where: { userId: user.id, status: "known" } }),
      prisma.userKanji.count({ where: { userId: user.id, status: "learning" } }),
      prisma.userKanji.count({ where: { userId: user.id, status: "new" } }),
    ]);

  const streak = currentStreak(
    {
      streakCount: user.streakCount,
      streakBestCount: user.streakBestCount,
      lastStreakDay: user.lastStreakDay,
    },
    todayKey,
    yesterdayKey
  );

  const masteredCount = known + kanjiKnown;
  const { level: progressLevel, progress, nextMilestone } = calculateLevel(masteredCount);

  return {
    name: user.name,
    level: user.level,
    progressLevel,
    progress,
    nextMilestone,
    masteredCount,
    streak,
    bestStreak: user.streakBestCount,
    activeToday: user.lastStreakDay === todayKey,
    vocab: { known, learning, new: neww, total: known + learning + neww },
    kanji: {
      known: kanjiKnown,
      learning: kanjiLearning,
      new: kanjiNew,
      total: kanjiKnown + kanjiLearning + kanjiNew,
    },
    dueNow,
    messagesSent: totalMessages,
  };
});
