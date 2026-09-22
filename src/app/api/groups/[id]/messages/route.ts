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
import { messageLimiter } from "@/lib/rate-limiter";
import { nextChatMood, blendMood, isMood } from "@/lib/mood";
import { validateTokens } from "@/lib/tokenization";
import { applyEnrichments } from "@/lib/dictionary-enrich";
import { enrichTokensFromDb } from "@/lib/dictionary-enrich-db";
import { resolveReplyFields, serializeMessage } from "@/lib/message-serialize";

export async function DELETE(
  _req: Request,
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

  await prisma.message.deleteMany({ where: { chatId: id } });
  return NextResponse.json({ ok: true });
}

function rowToMsg(
  m: Parameters<typeof serializeMessage>[0],
  meId: string
) {
  return serializeMessage(m, meId);
}

async function bumpMoodOnUserReply(chatId: string, kind: string) {
  if (kind !== "persona") return null;
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: { moodScore: true, mood: true },
  });
  if (!chat) return null;

  const recent = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { senderKind: true, createdAt: true },
  });

  let consecutiveIgnored = 0;
  for (let i = 1; i < recent.length; i++) {
    if (recent[i].senderKind === "persona") consecutiveIgnored++;
    else break;
  }

  const priorUser = recent.find((m, i) => i > 0 && m.senderKind === "user");
  const hoursSinceUserReply = priorUser
    ? (Date.now() - priorUser.createdAt.getTime()) / 3.6e6
    : Infinity;

  const next = nextChatMood({
    hoursSinceUserReply,
    consecutiveIgnored,
    userJustReplied: true,
    moodScore: chat.moodScore,
  });

  await prisma.chat.update({
    where: { id: chatId },
    data: {
      mood: next.mood,
      moodScore: next.moodScore,
      moodUpdatedAt: new Date(),
    },
  });
  return next;
}

async function applyModelMood(chatId: string, modelMood: unknown) {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: { mood: true, moodScore: true },
  });
  if (!chat) return;
  const det = isMood(chat.mood) ? chat.mood : "neutral";
  const blended = blendMood(det, modelMood, chat.moodScore);
  await prisma.chat.update({
    where: { id: chatId },
    data: {
      mood: blended.mood,
      moodScore: blended.moodScore,
      moodUpdatedAt: new Date(),
    },
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (messageLimiter.isRateLimited(user.id)) {
    return NextResponse.json(
      { error: "Too many messages. Please slow down." },
      { status: 429 }
    );
  }

  const { id } = await params;

  const me = await prisma.chatMember.findFirst({
    where: { chatId: id, userId: user.id, kind: "user", status: "accepted" },
    select: { id: true },
  });
  if (!me) return NextResponse.json({ error: "Not a member." }, { status: 403 });

  let body: {
    content?: string;
    userCorrection?: string;
    quotedMessageId?: string;
    aiReply?: {
      reply: string;
      english?: string;
      tokens?: unknown[];
      correction?: unknown;
      mood?: string;
    };
  };
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

  const hiddenMembers = await prisma.chatMember.findMany({
    where: { chatId: id, hidden: true, kind: "user" },
    select: { id: true },
  });

  if (hiddenMembers.length > 0) {
    await prisma.chatMember.updateMany({
      where: { id: { in: hiddenMembers.map((m) => m.id) } },
      data: { hidden: false },
    });
  }

  const replyFields = await resolveReplyFields(
    (qid) =>
      prisma.message.findUnique({
        where: { id: qid },
        select: {
          id: true,
          chatId: true,
          senderName: true,
          senderKind: true,
          senderUserId: true,
          content: true,
        },
      }),
    id,
    body.quotedMessageId
  );

  const humanMsg = await prisma.message.create({
    data: {
      chatId: id,
      memberId: me.id,
      senderUserId: user.id,
      senderName,
      senderKind: "user",
      content,
      userCorrection: body.userCorrection || null,
      ...(replyFields ?? {}),
    },
  });

  const group = await prisma.chat.findUnique({
    where: { id },
    include: {
      members: { where: { kind: "persona" }, include: { persona: true } },
    },
  });

  const moodUpdate = await bumpMoodOnUserReply(id, group?.kind ?? "group");
  const newMessages = [rowToMsg(humanMsg, user.id)];
  const personaMember = group?.members.find((m) => m.persona);

  if (body.aiReply && body.aiReply.reply && personaMember?.persona) {
    const a = body.aiReply;
    const { tokens: validated } = validateTokens(a.reply, a.tokens);
    const enrichments = await enrichTokensFromDb(
      user.id,
      validated.map((t) => ({
        surface: t.surface,
        dictForm: t.dictForm,
        reading: t.reading,
        meaning: t.meaning,
        pos: t.pos,
      }))
    );
    const tokens = applyEnrichments(validated, enrichments);
    const saved = await prisma.message.create({
      data: {
        chatId: id,
        memberId: personaMember.id,
        senderName: personaMember.persona.name,
        senderKind: "persona",
        content: a.reply,
        english: typeof a.english === "string" && a.english ? a.english : null,
        tokens: tokens.length ? JSON.stringify(tokens) : null,
        correction: hasFeedback(normalizeCorrection(a.correction))
          ? JSON.stringify(normalizeCorrection(a.correction))
          : null,
      },
    });
    if (a.mood) await applyModelMood(id, a.mood);
    newMessages.push(rowToMsg(saved, user.id));
    return NextResponse.json({
      messages: newMessages,
      mood: moodUpdate?.mood,
      moodScore: moodUpdate?.moodScore,
    });
  }

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

    const recent = await prisma.message.findMany({
      where: { chatId: id },
      orderBy: { createdAt: "desc" },
      take: 12,
    });
    const turns: ConvTurn[] = recent
      .reverse()
      .map((m) => ({
        senderName: m.senderName,
        senderKind: m.senderKind,
        content: m.content,
      }));

    const humanNames = await prisma.chatMember.findMany({
      where: { chatId: id, kind: "user" },
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
        const saved = await prisma.message.create({
          data: {
            chatId: id,
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
        if (r.mood) await applyModelMood(id, r.mood);
        newMessages.push(rowToMsg(saved, user.id));
      }
    } catch {
      // best-effort
    }
  }

  return NextResponse.json({
    messages: newMessages,
    mood: moodUpdate?.mood,
    moodScore: moodUpdate?.moodScore,
  });
}
