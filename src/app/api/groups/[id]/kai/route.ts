import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { resolveKaiId } from "@/lib/personas-server";

async function ownerGroup(userId: string, id: string) {
  const chat = await prisma.chat.findUnique({
    where: { id },
    select: {
      kind: true,
      ownerId: true,
      members: { where: { kind: "persona" }, select: { id: true, personaId: true } },
    },
  });
  if (!chat) return { error: "Not found.", status: 404 } as const;
  if (chat.ownerId !== userId) {
    return { error: "Only the owner can change this group.", status: 403 } as const;
  }
  if (chat.kind !== "group") {
    return { error: "Only groups can add or remove Kai.", status: 400 } as const;
  }
  return { chat } as const;
}

// POST: put Kai into a group. Body (optional): { modeId }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const result = await ownerGroup(user.id, id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  if (result.chat.members.length > 0) {
    return NextResponse.json({ error: "Kai is already here." }, { status: 409 });
  }

  const kaiId = await resolveKaiId();
  if (!kaiId) {
    return NextResponse.json({ error: "Kai isn't available." }, { status: 500 });
  }

  const body = (await req.json().catch(() => ({}))) as { modeId?: unknown };
  const modeId =
    typeof body.modeId === "string" && body.modeId ? body.modeId : null;
  if (modeId) {
    let mode: { id: string } | null = null;
    try {
      mode = await prisma.persona.findFirst({
        where: { id: modeId, kind: "kai_mode", modeOfId: kaiId },
        select: { id: true },
      });
    } catch {
      return NextResponse.json(
        { error: "Kai's attitudes need the personalities migration." },
        { status: 503 }
      );
    }
    if (!mode) {
      return NextResponse.json(
        { error: "That isn't one of Kai's attitudes." },
        { status: 400 }
      );
    }
  }

  await prisma.chatMember.create({
    data: { chatId: id, kind: "persona", personaId: kaiId, status: "accepted" },
  });
  if (modeId) {
    try {
      await prisma.chat.update({ where: { id }, data: { activeModeId: modeId } });
    } catch {
      return NextResponse.json(
        { error: "Kai's attitudes need the personalities migration." },
        { status: 503 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}

// DELETE: take Kai out of the group. Messages stay (memberId becomes null).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const result = await ownerGroup(user.id, id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const personaMember = result.chat.members[0];
  if (!personaMember) {
    return NextResponse.json({ error: "Kai isn't in this group." }, { status: 400 });
  }

  await prisma.chatMember.delete({ where: { id: personaMember.id } });
  try {
    await prisma.chat.update({ where: { id }, data: { activeModeId: null } });
  } catch {
    // Pre-migration there is no attitude column to clear; the member is gone.
  }

  return NextResponse.json({ ok: true });
}
