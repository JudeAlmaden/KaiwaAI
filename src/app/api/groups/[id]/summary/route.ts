import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

/** Persist a conversation summary (BYOK client calls summarizeConversation). */
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

  let body: { summary?: string; summaryUpToId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const summary = (body.summary ?? "").trim();
  if (!summary) return NextResponse.json({ error: "summary required" }, { status: 400 });
  if (summary.length > 4000) {
    return NextResponse.json({ error: "summary too long" }, { status: 400 });
  }

  await prisma.chat.update({
    where: { id },
    data: {
      summary,
      summaryUpToId: body.summaryUpToId ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
