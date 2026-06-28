import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { type CachedToken, type CardStatus } from "@/lib/types";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = new URL(req.url).searchParams.get("status");
  const where: { userId: string; status?: string } = { userId: user.id };
  if (status && ["new", "learning", "known"].includes(status)) {
    where.status = status;
  }

  const cards = await prisma.flashcard.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ cards });
}

// Tap-to-add: upsert a flashcard from a tapped token. Dedupes on dictForm.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    token?: CachedToken;
    word?: {
      word: string;
      reading: string;
      romaji: string;
      meaning: string;
      pos: string;
    };
    sourceMessageId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Accept either a tap-to-translate token or a looked-up word entry.
  const entry = body.token
    ? {
        dictForm: body.token.dictForm,
        reading: body.token.reading,
        romaji: body.token.romaji,
        meaning: body.token.meaning,
        pos: body.token.pos as string,
      }
    : body.word
      ? {
          dictForm: body.word.word,
          reading: body.word.reading,
          romaji: body.word.romaji,
          meaning: body.word.meaning,
          pos: body.word.pos,
        }
      : null;

  if (!entry?.dictForm) {
    return NextResponse.json({ error: "Missing word." }, { status: 400 });
  }

  // sourceMessageId is a FK to Message. Words tapped in persona/group chats
  // carry a GroupMessage id, which would violate the constraint — so only keep
  // it when it actually points at a Message we can reference.
  let sourceMessageId: string | null = body.sourceMessageId ?? null;
  if (sourceMessageId) {
    const ref = await prisma.message.findUnique({
      where: { id: sourceMessageId },
      select: { id: true },
    });
    if (!ref) sourceMessageId = null;
  }

  const existing = await prisma.flashcard.findUnique({
    where: { userId_word: { userId: user.id, word: entry.dictForm } },
  });

  const card = await prisma.flashcard.upsert({
    where: { userId_word: { userId: user.id, word: entry.dictForm } },
    update: {}, // already saved — no-op
    create: {
      userId: user.id,
      word: entry.dictForm,
      reading: entry.reading,
      romaji: entry.romaji,
      meaning: entry.meaning,
      partOfSpeech: entry.pos,
      status: "learning" as CardStatus,
      sourceMessageId,
    },
  });

  return NextResponse.json({ card, alreadyExisted: Boolean(existing) });
}
