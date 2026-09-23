import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getDashboardStatsForUser } from "@/lib/dashboard-stats";

// Dashboard stats for the home page.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stats = await getDashboardStatsForUser(user);
  return NextResponse.json(stats);
}
