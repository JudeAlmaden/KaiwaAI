import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

// PATCH: set a member's display name in this group. The owner can rename
// anyone; a member can rename themselves. Body: { nickname: string }
// An empty nickname clears it and falls back to the account name.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, memberId } = await params;

  const chat = await prisma.chat.findUnique({
    where: { id },
    select: { kind: true, ownerId: true },
  });
  if (!chat) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (chat.kind !== "group") {
    return NextResponse.json(
      { error: "Only group members have nicknames." },
      { status: 400 }
    );
  }

  const member = await prisma.chatMember.findFirst({
    where: { id: memberId, chatId: id },
    select: { id: true, userId: true, kind: true },
  });
  if (!member || member.kind !== "user" || !member.userId) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  const isOwner = chat.ownerId === user.id;
  const isSelf = member.userId === user.id;
  if (!isOwner && !isSelf) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  let body: { nickname?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (typeof body.nickname !== "string") {
    return NextResponse.json({ error: "Nickname required." }, { status: 400 });
  }

  const nickname = body.nickname.trim().slice(0, 24) || null;
  await prisma.chatMember.update({ where: { id: member.id }, data: { nickname } });
  return NextResponse.json({ ok: true, nickname });
}

// DELETE: the owner removes someone, or a member removes themselves (leave).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, memberId } = await params;

  const chat = await prisma.chat.findUnique({
    where: { id },
    select: { kind: true, ownerId: true },
  });
  if (!chat) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (chat.kind !== "group") {
    return NextResponse.json({ error: "Only groups have members." }, { status: 400 });
  }

  const member = await prisma.chatMember.findFirst({
    where: { id: memberId, chatId: id },
    select: { id: true, userId: true, kind: true },
  });
  if (!member || member.kind !== "user" || !member.userId) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }
  if (member.userId === chat.ownerId) {
    return NextResponse.json(
      { error: "The owner can't be removed. Delete the group instead." },
      { status: 400 }
    );
  }

  const isOwner = chat.ownerId === user.id;
  const isSelf = member.userId === user.id;
  if (!isOwner && !isSelf) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  await prisma.chatMember.delete({ where: { id: member.id } });
  return NextResponse.json({ ok: true, left: isSelf && !isOwner });
}
