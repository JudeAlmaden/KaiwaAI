import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { hasFeedback, normalizeCorrection } from "@/lib/types";
import { nextChatMood } from "@/lib/mood";
import { validateTokens } from "@/lib/tokenization";
import { applyEnrichments } from "@/lib/dictionary-enrich";
import { enrichTokensFromDb } from "@/lib/dictionary-enrich-db";

// POST: persist a persona-initiated (proactive) message — Kai/another persona
// reaching out first while the user is online. The reply is generated
// client-side (BYOK) and posted here for persistence. Only valid in a 1:1
// persona conversation the user belongs to.
export async function POST(
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

  let body: {
    reply?: string;
    english?: string;
    tokens?: unknown[];
    correction?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const reply = (body.reply ?? "").trim();
  if (!reply) return NextResponse.json({ error: "Empty reply." }, { status: 400 });

  const personaMember = await prisma.chatMember.findFirst({
    where: { chatId: id, kind: "persona" },
    include: { persona: { select: { name: true } } },
  });
  if (!personaMember?.persona) {
    return NextResponse.json({ error: "No persona here." }, { status: 400 });
  }

  const { tokens: validated } = validateTokens(reply, body.tokens);
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
      content: reply,
      english:
        typeof body.english === "string" && body.english ? body.english : null,
      tokens: tokens.length ? JSON.stringify(tokens) : null,
      correction: hasFeedback(normalizeCorrection(body.correction))
        ? JSON.stringify(normalizeCorrection(body.correction))
        : null,
    },
  });

  // Decay mood slightly when AI reaches out without a user reply.
  const chat = await prisma.chat.findUnique({
    where: { id },
    select: { moodScore: true, kind: true },
  });
  if (chat?.kind === "persona") {
    const lastUser = await prisma.message.findFirst({
      where: { chatId: id, senderKind: "user" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    const hoursSinceUserReply = lastUser
      ? (Date.now() - lastUser.createdAt.getTime()) / 3.6e6
      : Infinity;
    const recent = await prisma.message.findMany({
      where: { chatId: id },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { senderKind: true },
    });
    let consecutiveIgnored = 0;
    for (const m of recent) {
      if (m.senderKind === "persona") consecutiveIgnored++;
      else break;
    }
    const next = nextChatMood({
      hoursSinceUserReply,
      consecutiveIgnored,
      userJustReplied: false,
      moodScore: chat.moodScore,
    });
    await prisma.chat.update({
      where: { id },
      data: {
        mood: next.mood,
        moodScore: next.moodScore,
        moodUpdatedAt: new Date(),
      },
    });
  }

  return NextResponse.json({
    message: {
      id: saved.id,
      senderName: saved.senderName,
      senderKind: saved.senderKind,
      content: saved.content,
      english: saved.english,
      tokens: saved.tokens,
      correction: saved.correction,
      isMe: false,
      createdAt: saved.createdAt,
    },
  });
}
