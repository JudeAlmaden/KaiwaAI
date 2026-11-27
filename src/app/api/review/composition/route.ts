import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { LEARNING_CARD_WHERE, STUDIED_CARD_WHERE } from "@/lib/review/lifecycle";

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
    vocabAhead,
    kanjiAhead,
  ] = await Promise.all([
    // `timesReviewed: 0` is part of the definition of new: a card that lapsed
    // back to repetitions 0 is maintenance, not an introduction.
    prisma.userFlashcard.count({
      where: { userId: user.id, repetitions: 0, timesReviewed: 0, nextReview: { lte: now } },
    }),
    prisma.userFlashcard.count({
      where: { userId: user.id, AND: [STUDIED_CARD_WHERE], nextReview: { lte: now } },
    }),
    prisma.userKanji.count({
      where: { userId: user.id, repetitions: 0, timesReviewed: 0, nextReview: { lte: now } },
    }),
    prisma.userKanji.count({
      where: { userId: user.id, AND: [STUDIED_CARD_WHERE], nextReview: { lte: now } },
    }),
    prisma.userFlashcard.count({ where: { userId: user.id, ...LEARNING_CARD_WHERE } }),
    prisma.userKanji.count({ where: { userId: user.id, ...LEARNING_CARD_WHERE } }),
    // Studied but not due yet: the session keeps going with these once the due
    // pool is spent, so the projected total has to count them.
    prisma.userFlashcard.count({
      where: {
        userId: user.id,
        AND: [STUDIED_CARD_WHERE],
        nextReview: { gt: now },
      },
    }),
    prisma.userKanji.count({
      where: {
        userId: user.id,
        AND: [STUDIED_CARD_WHERE],
        nextReview: { gt: now },
      },
    }),
  ]);

  return NextResponse.json({
    due: {
      new: vocabNew + kanjiNew,
      review: vocabReview + kanjiReview,
      ahead: vocabAhead + kanjiAhead,
    },
    vocab: { new: vocabNew, review: vocabReview },
    kanji: { new: kanjiNew, review: kanjiReview },
    // Feeds the "why are new cards paused" lines. Per deck: the cap gates each
    // deck's own pile, so a quest is never paused by the other deck's backlog.
    intake: {
      vocabInProgress,
      kanjiInProgress,
      inProgress: vocabInProgress + kanjiInProgress,
    },
  });
}
