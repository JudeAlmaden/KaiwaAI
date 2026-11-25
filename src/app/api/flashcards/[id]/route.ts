import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { CardKind, PartOfSpeech } from "@/generated/prisma/client";

// Reset a card's SRS progress or update its status.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const owned = await prisma.userFlashcard.findFirst({ where: { id, userId: user.id } });
  if (!owned) return NextResponse.json({ error: "Not found." }, { status: 404 });

  let body: { action?: string; note?: string | null; kind?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (body.action === "reset") {
    const card = await prisma.userFlashcard.update({
      where: { id },
      data: {
        status: "new",
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        nextReview: new Date(),
      },
    });
    return NextResponse.json({ card });
  }

  if (body.action === "markKnown") {
    const next = new Date();
    next.setDate(next.getDate() + 21);
    const card = await prisma.userFlashcard.update({
      where: { id },
      data: { status: "known", repetitions: 3, interval: 21, nextReview: next },
    });
    return NextResponse.json({ card });
  }

  if (body.action === "updateNote") {
    const card = await prisma.userFlashcard.update({
      where: { id },
      data: { note: body.note },
    });
    return NextResponse.json({ card });
  }

  // Move the card between the Words and Phrases tabs. Scoped per user, so the
  // shared dictionary's part of speech is never touched.
  if (body.action === "setKind") {
    if (body.kind !== "word" && body.kind !== "phrase") {
      return NextResponse.json({ error: "Invalid kind." }, { status: 400 });
    }
    // Phrase-backed cards are inherently phrases (see the GET isPhrase safety
    // net), so only word-backed cards can move between tabs.
    if (owned.phraseId) {
      return NextResponse.json(
        { error: "Saved phrases stay under Phrases." },
        { status: 400 }
      );
    }
    const card = await prisma.userFlashcard.update({
      where: { id },
      data: { kind: body.kind === "phrase" ? CardKind.phrase : CardKind.word },
    });
    return NextResponse.json({ card });
  }

  if (body.action === "editCard") {
    const { reading, meaning, partOfSpeech } = body as {
      reading?: string;
      meaning?: string;
      partOfSpeech?: string;
    };

    if (owned.phraseId) {
      const meaningsJson = meaning ? JSON.stringify([meaning]) : undefined;
      await prisma.phrase.update({
        where: { id: owned.phraseId, userId: user.id },
        data: {
          ...(reading ? { reading: reading.trim() } : {}),
          ...(meaningsJson ? { meanings: meaningsJson } : {}),
          ...(partOfSpeech && partOfSpeech in PartOfSpeech
            ? { partOfSpeech: partOfSpeech as PartOfSpeech }
            : {}),
        },
      });
    } else if (owned.wordId) {
      // Dictionary words are shared, so corrections live on this user's card.
      // An empty value clears the override and falls back to the dictionary.
      const overrides: { readingOverride?: string | null; meaningOverride?: string | null } = {};
      if (reading !== undefined) overrides.readingOverride = reading.trim() || null;
      if (meaning !== undefined) overrides.meaningOverride = meaning.trim() || null;
      if (Object.keys(overrides).length > 0) {
        await prisma.userFlashcard.update({ where: { id }, data: overrides });
      }
    }

    const updated = await prisma.userFlashcard.findUnique({
      where: { id },
      include: { word: true, wordForm: true, phrase: true },
    });
    return NextResponse.json({ card: updated });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const owned = await prisma.userFlashcard.findFirst({ where: { id, userId: user.id } });
  if (!owned) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await prisma.userFlashcard.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
