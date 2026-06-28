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

// GET: group detail — members + a page of messages (newest first, paginated).
// Query: ?before=<messageId> loads the page of older messages before that id.
export async function GET(
  req: Request,
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

  const PAGE_SIZE = 30;
  const before = new URL(req.url).searchParams.get("before");

  // Pull newest-first so we always get the most recent window, then fetch one
  // extra to know whether older messages remain. `before` walks further back.
  const rows = await prisma.groupMessage.findMany({
    where: { groupId: id },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    ...(before ? { cursor: { id: before }, skip: 1 } : {}),
  });
  const hasMore = rows.length > PAGE_SIZE;
  // Drop the probe row, then flip back to chronological (ascending) order.
  const page = (hasMore ? rows.slice(0, PAGE_SIZE) : rows).reverse();

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
    hasMore,
    messages: page.map((m) => ({
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
