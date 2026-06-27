import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { dayKeyFor, previousDayKey } from "@/lib/day";
import { advanceStreak, currentStreak } from "@/lib/streak";

// Registers a visit: advances the daily streak and resets Kai's "ignored"
// counter. Safe to call on every app load (idempotent within a day).
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const todayKey = dayKeyFor(now, user.timezone);
  const yesterdayKey = previousDayKey(todayKey);

  const next = advanceStreak(
    {
      streakCount: user.streakCount,
      streakBestCount: user.streakBestCount,
      lastStreakDay: user.lastStreakDay,
    },
    todayKey,
    yesterdayKey
  );

  if (next) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        streakCount: next.streakCount,
        streakBestCount: next.streakBestCount,
        lastStreakDay: next.lastStreakDay,
        lastActiveAt: now,
        consecutiveIgnored: 0,
      },
    });
    return NextResponse.json({ streak: next.streakCount, best: next.streakBestCount });
  }

  // Already counted today — just refresh activity.
  await prisma.user.update({
    where: { id: user.id },
    data: { lastActiveAt: now, consecutiveIgnored: 0 },
  });
  const streak = currentStreak(
    {
      streakCount: user.streakCount,
      streakBestCount: user.streakBestCount,
      lastStreakDay: user.lastStreakDay,
    },
    todayKey,
    yesterdayKey
  );
  return NextResponse.json({ streak, best: user.streakBestCount });
}
