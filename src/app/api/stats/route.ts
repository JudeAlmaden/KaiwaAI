import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { dayKeyFor, previousDayKey } from "@/lib/day";
import { currentStreak } from "@/lib/streak";

// Dashboard stats for the home page.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const todayKey = dayKeyFor(now, user.timezone);
  const yesterdayKey = previousDayKey(todayKey);

  const [known, learning, neww, dueNow, totalMessages, kanjiKnown, kanjiLearning, kanjiNew] = await Promise.all([
    prisma.flashcard.count({ where: { userId: user.id, status: "known" } }),
    prisma.flashcard.count({ where: { userId: user.id, status: "learning" } }),
    prisma.flashcard.count({ where: { userId: user.id, status: "new" } }),
    prisma.flashcard.count({
      where: { userId: user.id, nextReview: { lte: now } },
    }),
    prisma.message.count({ where: { userId: user.id, role: "user" } }),
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

  // Calculate progression level based on mastered content
  const masteredCount = known + kanjiKnown;
  const { level: progressLevel, progress, nextMilestone } = calculateLevel(masteredCount);

  return NextResponse.json({
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
    kanji: { known: kanjiKnown, learning: kanjiLearning, new: kanjiNew, total: kanjiKnown + kanjiLearning + kanjiNew },
    dueNow,
    messagesSent: totalMessages,
  });
}

// Level system based on mastered words + kanji
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

  const current = milestones.find(m => masteredCount >= m.min && masteredCount < m.max) || milestones[milestones.length - 1];
  
  // Calculate progress within current level (0-100%)
  const levelRange = current.max - current.min;
  const levelProgress = masteredCount - current.min;
  const progress = levelRange === Infinity ? 100 : Math.min(100, Math.floor((levelProgress / levelRange) * 100));

  return {
    level: current.level,
    progress,
    nextMilestone: current.max === Infinity ? current.min : current.max,
  };
}
