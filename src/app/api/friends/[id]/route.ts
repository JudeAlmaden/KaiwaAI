import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

// PATCH: accept a pending request (only the addressee may accept).
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const fr = await prisma.friendship.findUnique({ where: { id } });
  if (!fr || fr.addresseeId !== user.id || fr.status !== "pending") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const updated = await prisma.friendship.update({
    where: { id },
    data: { status: "accepted" },
  });
  return NextResponse.json({ friendship: updated });
}

// DELETE: decline a request or remove an existing friend (either party).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const fr = await prisma.friendship.findUnique({ where: { id } });
  if (!fr || (fr.requesterId !== user.id && fr.addresseeId !== user.id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await prisma.friendship.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
