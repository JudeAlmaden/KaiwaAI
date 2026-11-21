import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { encryptSecret } from "@/lib/crypto";
import { serializeMessage } from "@/lib/message-serialize";
import { composePersonaPersonality } from "@/lib/personas";
import { normalizePersonaRole } from "@/lib/persona-role";

async function membership(userId: string, groupId: string) {
  return prisma.chatMember.findFirst({
    where: { chatId: groupId, userId, kind: "user", status: "accepted" },
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

  const group = await prisma.chat.findUnique({
    where: { id },
    // Explicit select: the default would include columns added by a migration
    // that may not be applied yet.
    select: {
      id: true,
      name: true,
      kind: true,
      ownerId: true,
      apiKeyEnc: true,
      mood: true,
      moodScore: true,
      summary: true,
      summaryUpToId: true,
      members: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          persona: {
            select: {
              id: true,
              name: true,
              avatar: true,
              personality: true,
              builtin: true,
            },
          },
        },
      },
    },
  });
  if (!group) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!(await membership(user.id, id)))
    return NextResponse.json({ error: "Not a member." }, { status: 403 });

  // A group nickname is the member's display name in this conversation only, so
  // it also replaces the denormalized name on their messages.
  const nicknameFor = (memberId: string | null | undefined) => {
    if (!memberId) return null;
    return group.members.find((m) => m.id === memberId)?.nickname ?? null;
  };
  const shapeMessage = (
    row: Parameters<typeof serializeMessage>[0] & { memberId?: string | null }
  ) => {
    const msg = serializeMessage(row, user.id);
    const nickname = row.senderKind === "user" ? nicknameFor(row.memberId) : null;
    return nickname ? { ...msg, senderName: nickname } : msg;
  };

  const PAGE_SIZE = 30;
  const before = new URL(req.url).searchParams.get("before");
  const after = new URL(req.url).searchParams.get("after");

  // If "after" is provided, fetch messages newer than that ID (polling for new messages)
  if (after) {
    const newMessages = await prisma.message.findMany({
      where: {
        chatId: id,
        createdAt: { gt: (await prisma.message.findUnique({ where: { id: after } }))?.createdAt },
      },
      orderBy: { createdAt: "asc" },
      take: 50, // Limit to 50 new messages at once
    });

    return NextResponse.json({
      messages: newMessages.map(shapeMessage),
    });
  }

  // Pull newest-first so we always get the most recent window, then fetch one
  // extra to know whether older messages remain. `before` walks further back.
  const rows = await prisma.message.findMany({
    where: { chatId: id },
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
  // A Kai conversation's selected personality is layered onto Kai's voice
  // here, so every client (chat, proactive, fallback) sees one prompt.
  // Derive the role from the built-in name so an unmigrated database (no
  // Persona.kind yet) still renders Kai correctly.
  const personaKind = personaMember?.persona
          ? normalizePersonaRole({
        name: personaMember.persona.name,
        builtin: personaMember.persona.builtin,
      }).kind
    : null;
  const isKai = personaKind === "kai";

  // Attitude tables only exist after the personalities migration; a failed
  // query here must not break the conversation itself.
  let activeMode = null;
  let kaiModes: { id: string; name: string; label: string | null; avatar: string; personality: string | null; builtin: boolean; userId: string | null }[] = [];
  if (isKai && personaMember?.persona) {
    try {
      activeMode =
        (
          await prisma.chat.findUnique({
            where: { id },
            select: {
              activeMode: {
                select: {
                  id: true,
                  name: true,
                  label: true,
                  avatar: true,
                  personality: true,
                },
              },
            },
          })
        )?.activeMode ?? null;
      kaiModes = await prisma.persona.findMany({
        where: {
          kind: "kai_mode",
          modeOfId: personaMember.persona.id,
          OR: [{ builtin: true }, { userId: user.id }],
        },
        orderBy: [{ builtin: "desc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          label: true,
          avatar: true,
          personality: true,
          builtin: true,
          userId: true,
        },
      });
    } catch {
      // Migration not applied yet: Kai keeps the base voice.
    }
  }
  const personality = personaMember?.persona
    ? composePersonaPersonality(personaMember.persona.personality, activeMode)
    : null;

  return NextResponse.json({
    group: {
      id: group.id,
      name: group.name,
      kind: group.kind,
      isOwner: group.ownerId === user.id,
      hasKey: Boolean(group.apiKeyEnc),
      mood: group.mood,
      moodScore: group.moodScore,
      summary: group.summary,
      summaryUpToId: group.summaryUpToId,
      persona: personaMember?.persona
        ? {
            id: personaMember.persona.id,
            name: personaMember.persona.name,
            avatar: personaMember.persona.avatar,
            kind: personaKind ?? "custom",
            personality: personality ?? personaMember.persona.personality,
          }
        : null,
      activeMode: activeMode
        ? {
            id: activeMode.id,
            label: activeMode.label ?? activeMode.name,
            avatar: activeMode.avatar,
          }
        : null,
      kaiModes: kaiModes.map((m) => ({
        id: m.id,
        label: m.label ?? m.name,
        avatar: m.avatar,
        personality: m.personality,
        builtin: m.builtin,
        mine: m.userId === user.id,
      })),
      clientGenerated: hasPersona,
      members: group.members
        .filter(
          (m) =>
            m.kind === "persona" ||
            m.status === "accepted" ||
            // Owners manage pending invites too.
            group.ownerId === user.id
        )
        .map((m) => ({
          id: m.id,
          kind: m.kind,
          status: m.status,
          userId: m.userId,
          nickname: m.nickname,
          name:
            m.nickname ??
            (m.kind === "user" ? m.user?.name || m.user?.email : m.persona?.name),
          avatar: m.kind === "persona" ? m.persona?.avatar : null,
          isMe: m.userId === user.id,
        })),
    },
    hasMore,
    messages: page.map(shapeMessage),
  });
}

// PATCH: owner renames the group or sets its API key(s).
// Body: { name: string } or { keys: string[] }
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const group = await prisma.chat.findUnique({ where: { id } });
  if (!group) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (group.ownerId !== user.id)
    return NextResponse.json({ error: "Only the owner can do that." }, { status: 403 });

  let body: { keys?: string[]; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (typeof body.name === "string") {
    const name = body.name.trim().slice(0, 60);
    if (!name) return NextResponse.json({ error: "Name required." }, { status: 400 });
    await prisma.chat.update({ where: { id }, data: { name } });
    if (!Array.isArray(body.keys)) return NextResponse.json({ ok: true, name });
  }

  const keys = Array.isArray(body.keys)
    ? body.keys.map((k) => String(k).trim()).filter(Boolean)
    : [];

  const apiKeyEnc = keys.length > 0 ? encryptSecret(JSON.stringify(keys)) : null;
  await prisma.chat.update({ where: { id }, data: { apiKeyEnc } });

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

  const group = await prisma.chat.findUnique({ where: { id } });
  if (!group) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (group.ownerId !== user.id)
    return NextResponse.json({ error: "Only the owner can delete." }, { status: 403 });

  await prisma.chat.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
