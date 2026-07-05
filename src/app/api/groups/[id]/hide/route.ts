import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

// POST: hide a conversation from the user's chat list
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const member = await prisma.groupMember.findFirst({
    where: { groupId: id, userId: user.id, kind: "user" },
  });

  if (!member) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  await prisma.groupMember.update({
    where: { id: member.id },
    data: { hidden: true },
  });

  return NextResponse.json({ ok: true });
}

// DELETE: unhide a conversation (show it again)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const member = await prisma.groupMember.findFirst({
    where: { groupId: id, userId: user.id, kind: "user" },
  });

  if (!member) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  await prisma.groupMember.update({
    where: { id: member.id },
    data: { hidden: false },
  });

  return NextResponse.json({ ok: true });
}
