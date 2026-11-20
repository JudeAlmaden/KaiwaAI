import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { isStrangerChatEnabled } from "@/lib/stranger/config";

// Lightweight lobby stat: people waiting plus people already in a room.
export async function GET() {
  if (!isStrangerChatEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const [waiting, inRooms] = await Promise.all([
    prisma.strangerQueueEntry.count({ where: { expiresAt: { gt: now } } }),
    prisma.strangerParticipant.count({
      where: {
        leftAt: null,
        session: { status: "active", expiresAt: { gt: now } },
      },
    }),
  ]);

  return NextResponse.json({ waiting, inRooms, online: waiting + inRooms });
}
