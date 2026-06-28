import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

// GET: pending group invites for the current user.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pending = await prisma.groupMember.findMany({
    where: { userId: user.id, kind: "user", status: "pending" },
    include: {
      group: {
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
    groupId: m.groupId,
    groupName: m.group.name,
    invitedBy: m.group.owner.name || m.group.owner.email,
    persona: m.group.members.find((x) => x.kind === "persona")?.persona ?? null,
    memberCount: m.group.members.filter((x) => x.kind === "user").length,
  }));

  return NextResponse.json({ invites });
}
