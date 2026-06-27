import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { dayKeyFor, previousDayKey } from "@/lib/day";
import { advanceStreak } from "@/lib/streak";
import { charLength, MAX_MESSAGE_CHARS, isLexical } from "@/lib/types";
import type { CachedToken } from "@/lib/types";

// Returns a page of messages, newest-first window. Use ?before=<messageId> to
// page backwards (older). Default page size keeps the initial load light.
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const pageSize = Math.min(Math.max(Number(sp.get("limit")) || 25, 1), 100);
  const before = sp.get("before"); // a message id to page older than

  let beforeDate: Date | undefined;
  if (before) {
    const anchor = await prisma.message.findFirst({
      where: { id: before, userId: user.id },
      select: { createdAt: true },
    });
    if (anchor) beforeDate = anchor.createdAt;
  }

  // Fetch newest first (optionally older than the cursor), then reverse to asc.
  const page = await prisma.message.findMany({
    where: {
      userId: user.id,
      ...(beforeDate ? { createdAt: { lt: beforeDate } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: pageSize + 1, // grab one extra to know if more remain
  });

  const hasMore = page.length > pageSize;
  const slice = hasMore ? page.slice(0, pageSize) : page;
  const messages = slice.reverse(); // back to chronological order

  return NextResponse.json({ messages, hasMore });
}

// Clear the whole conversation.
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.message.deleteMany({ where: { userId: user.id } });
  return NextResponse.json({ ok: true });
}

// Persists one turn: the user's message + Kai's reply (with cached tokens),
// and auto-saves any words Kai deliberately introduced as `new` flashcards.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    userText?: string;
    reply?: string;
    english?: string;
    tokens?: CachedToken[];
    newWords?: string[];
    autoSave?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const userText = (body.userText ?? "").trim();
  const reply = (body.reply ?? "").trim();
  if (!userText || !reply) {
    return NextResponse.json({ error: "Missing message text." }, { status: 400 });
  }
  if (charLength(userText) > MAX_MESSAGE_CHARS) {
    return NextResponse.json(
      { error: `Message too long (max ${MAX_MESSAGE_CHARS}).` },
      { status: 400 }
    );
  }

  const tokens = Array.isArray(body.tokens) ? body.tokens : [];
  const newWords = Array.isArray(body.newWords) ? body.newWords : [];
  const dayKey = dayKeyFor(new Date(), user.timezone);

  // The user is active — advance the streak and reset Kai's "ignored" mood.
  {
    const next = advanceStreak(
      {
        streakCount: user.streakCount,
        streakBestCount: user.streakBestCount,
        lastStreakDay: user.lastStreakDay,
      },
      dayKey,
      previousDayKey(dayKey)
    );
    await prisma.user.update({
      where: { id: user.id },
      data: {
        consecutiveIgnored: 0,
        lastActiveAt: new Date(),
        ...(next
          ? {
              streakCount: next.streakCount,
              streakBestCount: next.streakBestCount,
              lastStreakDay: next.lastStreakDay,
            }
          : {}),
      },
    });
  }

  const userMsg = await prisma.message.create({
    data: { userId: user.id, role: "user", content: userText, dayKey },
  });

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
      dayKey,
    },
  });

  // Auto-save Kai's newly introduced words as flashcards (status: new).
  // Only auto-save Kai's introduced words when the user opted in. Otherwise the
  // deck only grows from words the user deliberately taps "+ Add to review".
  if (body.autoSave) {
    for (const dictForm of newWords) {
      const tok = tokens.find((t) => t.dictForm === dictForm);
      if (!tok || !isLexical(tok.pos)) continue;
      await prisma.flashcard.upsert({
        where: { userId_word: { userId: user.id, word: tok.dictForm } },
        update: { exposures: { increment: 1 } },
        create: {
          userId: user.id,
          word: tok.dictForm,
          reading: tok.reading,
          romaji: tok.romaji,
          meaning: tok.meaning,
          partOfSpeech: tok.pos,
          status: "new",
          sourceMessageId: kaiMsg.id,
        },
      });
    }
  }

  return NextResponse.json({ userMessage: userMsg, kaiMessage: kaiMsg });
}
