import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Sidebar, BottomTabs, MobileTopBar } from "./AppNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Placeholder until Phase 5 wires real streak/progress data.
  const streak = 0;

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar email={session.email} streak={streak} />

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
