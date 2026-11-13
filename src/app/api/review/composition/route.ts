import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

// Due cards split by class, so the home screen can show the mix a session will
// actually contain ("6 review · 4 new") instead of one opaque number.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();

  const [vocabNew, vocabReview, kanjiNew, kanjiReview] = await Promise.all([
    prisma.userFlashcard.count({
      where: { userId: user.id, repetitions: 0, nextReview: { lte: now } },
    }),
    prisma.userFlashcard.count({
      where: { userId: user.id, repetitions: { gt: 0 }, nextReview: { lte: now } },
    }),
    prisma.userKanji.count({
      where: { userId: user.id, repetitions: 0, nextReview: { lte: now } },
    }),
    prisma.userKanji.count({
      where: { userId: user.id, repetitions: { gt: 0 }, nextReview: { lte: now } },
    }),
  ]);

  return NextResponse.json({
    due: {
      new: vocabNew + kanjiNew,
      review: vocabReview + kanjiReview,
    },
    vocab: { new: vocabNew, review: vocabReview },
    kanji: { new: kanjiNew, review: kanjiReview },
  });
}
