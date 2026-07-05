import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

// POST: Add a kanji to user's review queue (UserKanji table)
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ character: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { character } = await params;

  // Find the kanji
  const kanji = await prisma.kanji.findUnique({
    where: { character },
  });

  if (!kanji) {
    return NextResponse.json({ error: "Kanji not found" }, { status: 404 });
  }

  // Check if already in user's review queue
  const existing = await prisma.userKanji.findUnique({
    where: {
      userId_kanjiId: {
        userId: user.id,
        kanjiId: kanji.id,
      },
    },
  });

  if (existing) {
    return NextResponse.json({ already: true, userKanji: existing });
  }

  // Add to review queue
  const userKanji = await prisma.userKanji.create({
    data: {
      userId: user.id,
      kanjiId: kanji.id,
      status: "new",
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      timesReviewed: 0,
      nextReview: new Date(), // Due immediately
    },
  });

  return NextResponse.json({ ok: true, userKanji });
}

// DELETE: Remove a kanji from user's review queue
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ character: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { character } = await params;

  // Find the kanji
  const kanji = await prisma.kanji.findUnique({
    where: { character },
  });

  if (!kanji) {
    return NextResponse.json({ error: "Kanji not found" }, { status: 404 });
  }

  // Remove from review queue
  await prisma.userKanji.deleteMany({
    where: {
      userId: user.id,
      kanjiId: kanji.id,
    },
  });

  return NextResponse.json({ ok: true });
}
