import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

// PATCH: accept a group invite (the pending membership becomes accepted).
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const member = await prisma.groupMember.findUnique({ where: { id } });
  if (!member || member.userId !== user.id || member.status !== "pending") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const updated = await prisma.groupMember.update({
    where: { id },
    data: { status: "accepted" },
  });
  return NextResponse.json({ ok: true, groupId: updated.groupId });
}

// DELETE: decline an invite (removes the pending membership).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const member = await prisma.groupMember.findUnique({ where: { id } });
  if (!member || member.userId !== user.id || member.status !== "pending") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await prisma.groupMember.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
