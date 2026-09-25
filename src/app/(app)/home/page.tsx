import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getDashboardStatsForUser } from "@/lib/dashboard-stats";
import KaiRoomClient from "./KaiRoomClient";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const initialStats = await getDashboardStatsForUser(user);

  return <KaiRoomClient initialStats={initialStats} />;
}
