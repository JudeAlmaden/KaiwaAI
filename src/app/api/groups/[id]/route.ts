import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { encryptSecret } from "@/lib/crypto";

async function membership(userId: string, groupId: string) {
  return prisma.groupMember.findFirst({
    where: { groupId, userId, kind: "user", status: "accepted" },
    select: { id: true },
  });
}

// GET: group detail — members + recent messages. Members only.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          persona: { select: { id: true, name: true, avatar: true, personality: true } },
        },
      },
    },
  });
  if (!group) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!(await membership(user.id, id)))
    return NextResponse.json({ error: "Not a member." }, { status: 403 });

  const messages = await prisma.groupMessage.findMany({
    where: { groupId: id },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  const personaMember = group.members.find((m) => m.kind === "persona");
  // Persona conversations use client-side BYOK generation: the persona's
  // personality is sent so the browser can call Gemini directly. In 1:1 chats
  // the persona always replies; in groups it only replies when @mentioned.
  const hasPersona = Boolean(personaMember?.persona);

  return NextResponse.json({
    group: {
      id: group.id,
      name: group.name,
      kind: group.kind,
      isOwner: group.ownerId === user.id,
      hasKey: Boolean(group.apiKeyEnc),
      persona: personaMember?.persona
        ? {
            id: personaMember.persona.id,
            name: personaMember.persona.name,
            avatar: personaMember.persona.avatar,
            personality: personaMember.persona.personality,
          }
        : null,
      clientGenerated: hasPersona,
      members: group.members
        .filter((m) => m.kind === "persona" || m.status === "accepted")
        .map((m) => ({
          kind: m.kind,
          name:
            m.kind === "user" ? m.user?.name || m.user?.email : m.persona?.name,
          avatar: m.kind === "persona" ? m.persona?.avatar : null,
          isMe: m.userId === user.id,
        })),
    },
    messages: messages.map((m) => ({
      id: m.id,
      senderName: m.senderName,
      senderKind: m.senderKind,
      content: m.content,
      english: m.english,
      tokens: m.tokens,
      correction: m.correction,
      isMe: m.senderUserId === user.id,
      createdAt: m.createdAt,
    })),
  });
}

// PATCH: owner sets the group's API key(s). Body: { keys: string[] }
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (group.ownerId !== user.id)
    return NextResponse.json({ error: "Only the owner can do that." }, { status: 403 });

  let body: { keys?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const keys = Array.isArray(body.keys)
    ? body.keys.map((k) => String(k).trim()).filter(Boolean)
    : [];

  const apiKeyEnc = keys.length > 0 ? encryptSecret(JSON.stringify(keys)) : null;
  await prisma.group.update({ where: { id }, data: { apiKeyEnc } });

  return NextResponse.json({ ok: true, hasKey: Boolean(apiKeyEnc) });
}

// DELETE: owner deletes the group.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (group.ownerId !== user.id)
    return NextResponse.json({ error: "Only the owner can delete." }, { status: 403 });

  await prisma.group.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
