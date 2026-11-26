import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

const EMERGENCY_PASS_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/**
 * POST /api/app-lock/emergency-pass
 * Grants a 1-per-24h emergency pass for Focus Guard, persisted on the User row
 * so clearing localStorage or switching devices cannot bypass the daily limit.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() - EMERGENCY_PASS_COOLDOWN_MS);

  if (user.lastEmergencyPassAt && user.lastEmergencyPassAt > cutoff) {
    const nextAvailableAt = new Date(
      user.lastEmergencyPassAt.getTime() + EMERGENCY_PASS_COOLDOWN_MS
    );
    return NextResponse.json({
      granted: false,
      nextAvailableAt: nextAvailableAt.toISOString(),
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastEmergencyPassAt: now },
  });

  return NextResponse.json({ granted: true });
}
