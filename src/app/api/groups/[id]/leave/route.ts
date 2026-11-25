import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

// DELETE: remove this conversation for the current user only.
//   - a member of someone else's group leaves it (their ChatMember row goes,
//     so every list and membership check stops returning the chat)
//   - the last human in a persona chat deletes the chat instead, so no
//     ownerless conversation is left behind
//   - an owner who shares the conversation with other people must delete it
//     for everyone; there is no ownership transfer to hand it to
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const chat = await prisma.chat.findUnique({
    where: { id },
    select: {
      ownerId: true,
      members: { select: { id: true, userId: true, kind: true, status: true } },
    },
  });
  if (!chat) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const me = chat.members.find(
    (m) => m.kind === "user" && m.userId === user.id
  );
  if (!me) return NextResponse.json({ error: "Not a member." }, { status: 403 });

  const otherHumans = chat.members.filter(
    (m) =>
      m.kind === "user" &&
      m.userId !== user.id &&
      m.status === "accepted"
  );

  if (otherHumans.length === 0) {
    await prisma.chat.delete({ where: { id } });
    return NextResponse.json({ ok: true, scope: "chat" });
  }

  if (chat.ownerId === user.id) {
    return NextResponse.json(
      {
        error:
          "You own this conversation. Delete it for everyone instead.",
      },
      { status: 400 }
    );
  }

  await prisma.chatMember.delete({ where: { id: me.id } });
  return NextResponse.json({ ok: true, scope: "membership" });
}
