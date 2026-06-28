import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { hasFeedback, normalizeCorrection } from "@/lib/types";

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

  const me = await prisma.groupMember.findFirst({
    where: { groupId: id, userId: user.id, kind: "user", status: "accepted" },
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

  const personaMember = await prisma.groupMember.findFirst({
    where: { groupId: id, kind: "persona" },
    include: { persona: { select: { name: true } } },
  });
  if (!personaMember?.persona) {
    return NextResponse.json({ error: "No persona here." }, { status: 400 });
  }

  const saved = await prisma.groupMessage.create({
    data: {
      groupId: id,
      memberId: personaMember.id,
      senderName: personaMember.persona.name,
      senderKind: "persona",
      content: reply,
      english:
        typeof body.english === "string" && body.english ? body.english : null,
      tokens:
        Array.isArray(body.tokens) && body.tokens.length
          ? JSON.stringify(body.tokens)
          : null,
      correction: hasFeedback(normalizeCorrection(body.correction))
        ? JSON.stringify(normalizeCorrection(body.correction))
        : null,
    },
  });

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
