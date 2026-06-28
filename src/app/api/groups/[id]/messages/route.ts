import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { decodeKeys } from "@/lib/gemini-server";
import {
  renderTranscript,
  generatePersonaReply,
  type ConvPersona,
  type ConvTurn,
} from "@/lib/group-chat";
import { MAX_MESSAGE_CHARS, charLength, hasFeedback } from "@/lib/types";
import { normalizeCorrection } from "@/lib/types";

// DELETE: clear all messages in the conversation (keeps the conversation).
// Any accepted member may clear; this affects everyone in the conversation.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const me = await prisma.groupMember.findFirst({
    where: { groupId: id, userId: user.id, kind: "user", status: "accepted" },
    select: { id: true },
  });
  if (!me) return NextResponse.json({ error: "Not a member." }, { status: 403 });

  await prisma.groupMessage.deleteMany({ where: { groupId: id } });
  return NextResponse.json({ ok: true });
}

function rowToMsg(m: {
  id: string;
  senderName: string;
  senderKind: string;
  content: string;
  english: string | null;
  tokens: string | null;
  correction: string | null;
  senderUserId: string | null;
  createdAt: Date;
}, meId: string) {
  return {
    id: m.id,
    senderName: m.senderName,
    senderKind: m.senderKind,
    content: m.content,
    english: m.english,
    tokens: m.tokens,
    correction: m.correction,
    isMe: m.senderUserId === meId,
    createdAt: m.createdAt,
  };
}

// POST: send a human message; if the conversation has a persona + key, the
// persona replies once with the rich (tokens/english/correction) payload.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const me = await prisma.groupMember.findFirst({
    where: { groupId: id, userId: user.id, kind: "user", status: "accepted" },
    select: { id: true },
  });
  if (!me) return NextResponse.json({ error: "Not a member." }, { status: 403 });

  let body: { content?: string; aiReply?: { reply: string; english?: string; tokens?: unknown[]; correction?: unknown } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const content = (body.content ?? "").trim();
  if (!content) return NextResponse.json({ error: "Message required." }, { status: 400 });
  if (charLength(content) > MAX_MESSAGE_CHARS) {
    return NextResponse.json(
      { error: `Message too long (max ${MAX_MESSAGE_CHARS}).` },
      { status: 400 }
    );
  }

  const senderName = user.name || user.email;

  const humanMsg = await prisma.groupMessage.create({
    data: {
      groupId: id,
      memberId: me.id,
      senderUserId: user.id,
      senderName,
      senderKind: "user",
      content,
    },
  });

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      members: { where: { kind: "persona" }, include: { persona: true } },
    },
  });

  const newMessages = [rowToMsg(humanMsg, user.id)];

  const personaMember = group?.members.find((m) => m.persona);

  // ── Path A: client already generated the AI reply (BYOK solo persona chat).
  // Trust it only when this is a persona conversation and a persona exists.
  if (body.aiReply && body.aiReply.reply && personaMember?.persona) {
    const a = body.aiReply;
    const saved = await prisma.groupMessage.create({
      data: {
        groupId: id,
        memberId: personaMember.id,
        senderName: personaMember.persona.name,
        senderKind: "persona",
        content: a.reply,
        english: typeof a.english === "string" && a.english ? a.english : null,
        tokens: Array.isArray(a.tokens) && a.tokens.length ? JSON.stringify(a.tokens) : null,
        correction: hasFeedback(normalizeCorrection(a.correction))
          ? JSON.stringify(normalizeCorrection(a.correction))
          : null,
      },
    });
    newMessages.push(rowToMsg(saved, user.id));
    return NextResponse.json({ messages: newMessages });
  }

  // ── Path B: server-side generation with the owner's key (group chats).
  let keys: string[] = [];
  if (group?.apiKeyEnc) {
    try {
      keys = decodeKeys(group.apiKeyEnc);
    } catch {
      keys = [];
    }
  }

  if (personaMember?.persona && keys.length > 0) {
    const persona: ConvPersona = {
      memberId: personaMember.id,
      personaId: personaMember.persona.id,
      name: personaMember.persona.name,
      personality: personaMember.persona.personality,
      avatar: personaMember.persona.avatar,
    };

    const recent = await prisma.groupMessage.findMany({
      where: { groupId: id },
      orderBy: { createdAt: "desc" },
      take: 12,
    });
    const turns: ConvTurn[] = recent
      .reverse()
      .map((m) => ({ senderName: m.senderName, senderKind: m.senderKind, content: m.content }));

    // Other human speakers (so the persona knows who's in the room).
    const humanNames = await prisma.groupMember.findMany({
      where: { groupId: id, kind: "user" },
      include: { user: { select: { name: true, email: true } } },
    });
    const others = humanNames
      .map((h) => h.user?.name || h.user?.email || "")
      .filter((n) => n && n !== persona.name);

    try {
      const r = await generatePersonaReply({
        keys,
        persona,
        otherSpeakers: others,
        transcript: renderTranscript(turns),
        level: user.level,
      });
      if (r && r.reply) {
        const saved = await prisma.groupMessage.create({
          data: {
            groupId: id,
            memberId: persona.memberId,
            senderName: persona.name,
            senderKind: "persona",
            content: r.reply,
            english: r.english || null,
            tokens: r.tokens.length ? JSON.stringify(r.tokens) : null,
            correction: hasFeedback(r.correction)
              ? JSON.stringify(r.correction)
              : null,
          },
        });
        newMessages.push(rowToMsg(saved, user.id));
      }
    } catch {
      // best-effort: human message still saved
    }
  }

  return NextResponse.json({ messages: newMessages });
}
