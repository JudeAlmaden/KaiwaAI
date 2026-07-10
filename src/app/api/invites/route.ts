import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

// GET: pending group invites for the current user.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pending = await prisma.chatMember.findMany({
    where: { userId: user.id, kind: "user", status: "pending" },
    include: {
      chat: {
        include: {
          owner: { select: { name: true, email: true } },
          members: {
            include: { persona: { select: { name: true, avatar: true } } },
          },
        },
      },
    },
  });

  const invites = pending.map((m) => ({
    memberId: m.id,
    groupId: m.chatId,
    groupName: m.chat.name,
    invitedBy: m.chat.owner.name || m.chat.owner.email,
    persona: m.chat.members.find((x) => x.kind === "persona")?.persona ?? null,
    memberCount: m.chat.members.filter((x) => x.kind === "user").length,
  }));

  return NextResponse.json({ invites });
}
