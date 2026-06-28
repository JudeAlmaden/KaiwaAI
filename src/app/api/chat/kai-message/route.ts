import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { dayKeyFor } from "@/lib/day";
import type { CachedToken } from "@/lib/types";

// Persists a single Kai-only message (no user turn): used for proactive
// openers, continuous follow-ups, and quote-replies initiated by Kai while the
// user is online. Does NOT touch the streak (the user wasn't active) but does
// stamp lastOutreachAt so other schedulers respect the anti-spam window.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    reply?: string;
    english?: string;
    tokens?: CachedToken[];
    proactive?: boolean;
    replyToId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const reply = (body.reply ?? "").trim();
  if (!reply) {
    return NextResponse.json({ error: "Missing message text." }, { status: 400 });
  }

  const tokens = Array.isArray(body.tokens) ? body.tokens : [];

  // Validate the quote target belongs to this user (ignore otherwise).
  let replyToId: string | null = null;
  if (typeof body.replyToId === "string" && body.replyToId) {
    const target = await prisma.message.findFirst({
      where: { id: body.replyToId, userId: user.id },
      select: { id: true },
    });
    replyToId = target?.id ?? null;
  }

  const dayKey = dayKeyFor(new Date(), user.timezone);

  const kaiMsg = await prisma.message.create({
    data: {
      userId: user.id,
      role: "kai",
      content: reply,
      english:
        typeof body.english === "string" && body.english.trim()
          ? body.english.trim()
          : null,
      tokens: tokens.length ? JSON.stringify(tokens) : null,
      proactive: body.proactive === true,
      replyToId,
      dayKey,
    },
  });

  // Mark that Kai reached out so server-side schedulers honor the 6h window.
  await prisma.user.update({
    where: { id: user.id },
    data: { lastOutreachAt: new Date() },
  });

  return NextResponse.json({ kaiMessage: kaiMsg });
}
