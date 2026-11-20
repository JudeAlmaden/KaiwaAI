import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

// POST: owner invites a friend into an existing group. The invitee gets the
// normal pending membership and accepts from Requests.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const chat = await prisma.chat.findUnique({
    where: { id },
    select: { kind: true, ownerId: true },
  });
  if (!chat) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (chat.ownerId !== user.id) {
    return NextResponse.json({ error: "Only the owner can invite." }, { status: 403 });
  }
  if (chat.kind !== "group") {
    return NextResponse.json({ error: "Only groups have members." }, { status: 400 });
  }

  let body: { friendId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const friendId = typeof body.friendId === "string" ? body.friendId : "";
  if (!friendId) {
    return NextResponse.json({ error: "Pick a friend." }, { status: 400 });
  }

  const friendship = await prisma.friendship.findFirst({
    where: {
      status: "accepted",
      OR: [
        { requesterId: user.id, addresseeId: friendId },
        { requesterId: friendId, addresseeId: user.id },
      ],
    },
    select: { id: true },
  });
  if (!friendship) {
    return NextResponse.json({ error: "You can only invite friends." }, { status: 400 });
  }

  const existing = await prisma.chatMember.findFirst({
    where: { chatId: id, userId: friendId },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "They're already in this group." }, { status: 409 });
  }

  await prisma.chatMember.create({
    data: { chatId: id, kind: "user", userId: friendId, status: "pending" },
  });
  return NextResponse.json({ ok: true, pending: true });
}
