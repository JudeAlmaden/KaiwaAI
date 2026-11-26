import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { dayKeyFor, previousDayKey, startOfDayInTimezone } from "@/lib/day";
import { currentStreak } from "@/lib/streak";
import { STUDIED_CARD_WHERE } from "@/lib/review/lifecycle";
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

  const [
    known,
    learning,
    neww,
    vocabDue,
    totalMessages,
    kanjiKnown,
    kanjiLearning,
    kanjiNew,
    kanjiDue,
  ] = await Promise.all([
      prisma.userFlashcard.count({ where: { userId: user.id, status: "known" } }),
      prisma.userFlashcard.count({ where: { userId: user.id, status: "learning" } }),
      prisma.userFlashcard.count({ where: { userId: user.id, status: "new" } }),
      // Due vocab: same split as /api/review/composition (new = never studied,
      // review = studied at least once). Raw nextReview <= now counted all cards
      // regardless of study status, inflating dueNow vs what a session delivers.
      prisma.userFlashcard.count({
        where: {
          userId: user.id,
          nextReview: { lte: now },
          OR: [
            { repetitions: 0, timesReviewed: 0 },   // genuinely new
            { AND: [STUDIED_CARD_WHERE] },            // reviewed at least once
          ],
        },
      }),
      prisma.message.count({
        where: {
          senderUserId: user.id,
          senderKind: "user",
          createdAt: { gte: startOfDayInTimezone(todayKey, user.timezone) },
        },
      }),
      prisma.userKanji.count({ where: { userId: user.id, status: "known" } }),
      prisma.userKanji.count({ where: { userId: user.id, status: "learning" } }),
      prisma.userKanji.count({ where: { userId: user.id, status: "new" } }),
      // Due kanji: same split as /api/review/composition.
      prisma.userKanji.count({
        where: {
          userId: user.id,
          nextReview: { lte: now },
          OR: [
            { repetitions: 0, timesReviewed: 0 },
            { AND: [STUDIED_CARD_WHERE] },
          ],
        },
      }),
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
    dueNow: vocabDue + kanjiDue,
    messagesSent: totalMessages,
  };
});
