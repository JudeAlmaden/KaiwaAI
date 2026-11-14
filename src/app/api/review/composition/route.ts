import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { LEARNING_CARD_WHERE } from "@/lib/review/lifecycle";
import { introducedTodayWhere } from "@/lib/review/intake";

// Due cards split by class, so the home screen can show the mix a session will
// actually contain ("6 review · 4 new") instead of one opaque number.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();

  const [
    vocabNew,
    vocabReview,
    kanjiNew,
    kanjiReview,
    vocabInProgress,
    kanjiInProgress,
    vocabIntroduced,
    kanjiIntroduced,
  ] = await Promise.all([
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
    prisma.userFlashcard.count({ where: { userId: user.id, ...LEARNING_CARD_WHERE } }),
    prisma.userKanji.count({ where: { userId: user.id, ...LEARNING_CARD_WHERE } }),
    prisma.userFlashcard.count({ where: introducedTodayWhere(user.id, now, user.timezone) }),
    prisma.userKanji.count({ where: introducedTodayWhere(user.id, now, user.timezone) }),
  ]);

  return NextResponse.json({
    due: {
      new: vocabNew + kanjiNew,
      review: vocabReview + kanjiReview,
    },
    vocab: { new: vocabNew, review: vocabReview },
    kanji: { new: kanjiNew, review: kanjiReview },
    // Feeds the "why are new cards paused" line in Learning settings.
    intake: {
      inProgress: vocabInProgress + kanjiInProgress,
      introducedToday: vocabIntroduced + kanjiIntroduced,
    },
  });
}
