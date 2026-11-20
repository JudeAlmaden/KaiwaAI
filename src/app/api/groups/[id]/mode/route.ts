import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { composePersonaPersonality } from "@/lib/personas";

// PATCH: choose which Kai personality speaks in this conversation.
// Body: { modeId: string | null } — null resets Kai to their base voice.
// Group-owned: only the owner changes it, and everyone in the group hears it.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const me = await prisma.chatMember.findFirst({
    where: { chatId: id, userId: user.id, kind: "user", status: "accepted" },
    select: { id: true },
  });
  if (!me) return NextResponse.json({ error: "Not a member." }, { status: 403 });

  // The attitude column arrives with the personalities migration.
  try {
    await prisma.chat.findUnique({ where: { id }, select: { activeModeId: true } });
  } catch {
    return NextResponse.json(
      { error: "Kai's attitudes need the personalities migration." },
      { status: 503 }
    );
  }

  const chat = await prisma.chat.findUnique({
    where: { id },
    select: {
      ownerId: true,
      members: {
        where: { kind: "persona" },
        select: {
          persona: { select: { id: true, kind: true, personality: true } },
        },
      },
    },
  });
  if (!chat) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (chat.ownerId !== user.id) {
    return NextResponse.json(
      { error: "Only the owner can change Kai's attitude." },
      { status: 403 }
    );
  }

  const persona = chat.members[0]?.persona;
  if (!persona || persona.kind !== "kai") {
    return NextResponse.json(
      { error: "Only Kai conversations can change personality." },
      { status: 400 }
    );
  }

  let body: { modeId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const modeId =
    typeof body.modeId === "string" && body.modeId ? body.modeId : null;

  const mode = modeId
    ? await prisma.persona.findFirst({
        where: { id: modeId, kind: "kai_mode", modeOfId: persona.id },
        select: { id: true, name: true, label: true, avatar: true, personality: true },
      })
    : null;
  if (modeId && !mode) {
    return NextResponse.json({ error: "Unknown personality." }, { status: 400 });
  }

  await prisma.chat.update({
    where: { id },
    data: { activeModeId: modeId },
    select: { id: true },
  });

  return NextResponse.json({
    activeMode: mode
      ? { id: mode.id, label: mode.label ?? mode.name, avatar: mode.avatar }
      : null,
    personality: composePersonaPersonality(persona.personality, mode),
  });
}
