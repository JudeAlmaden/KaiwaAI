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

  const [known, learning, neww, dueNow, totalMessages] = await Promise.all([
    prisma.flashcard.count({ where: { userId: user.id, status: "known" } }),
    prisma.flashcard.count({ where: { userId: user.id, status: "learning" } }),
    prisma.flashcard.count({ where: { userId: user.id, status: "new" } }),
    prisma.flashcard.count({
      where: { userId: user.id, nextReview: { lte: now } },
    }),
    prisma.message.count({ where: { userId: user.id, role: "user" } }),
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

  return NextResponse.json({
    name: user.name,
    level: user.level,
    streak,
    bestStreak: user.streakBestCount,
    activeToday: user.lastStreakDay === todayKey,
    vocab: { known, learning, new: neww, total: known + learning + neww },
    dueNow,
    messagesSent: totalMessages,
  });
}
