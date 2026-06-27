import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { dayKeyFor, previousDayKey } from "@/lib/day";
import { currentStreak } from "@/lib/streak";
import { Sidebar, BottomTabs, MobileTopBar } from "./AppNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verify the session AND that the user still exists in the DB. A valid cookie
  // for a deleted user (e.g. after a DB reset) is treated as logged out.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const todayKey = dayKeyFor(new Date(), user.timezone);
  const streak = currentStreak(
    {
      streakCount: user.streakCount,
      streakBestCount: user.streakBestCount,
      lastStreakDay: user.lastStreakDay,
    },
    todayKey,
    previousDayKey(todayKey)
  );

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar email={user.email} streak={streak} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <MobileTopBar streak={streak} />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {children}
        </main>
        <BottomTabs />
      </div>
    </div>
  );
}
