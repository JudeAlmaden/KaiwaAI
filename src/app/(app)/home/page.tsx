import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getDashboardStatsForUser } from "@/lib/dashboard-stats";
import HomeClient from "./HomeClient";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const initialStats = await getDashboardStatsForUser(user);

  return <HomeClient initialStats={initialStats} />;
}
