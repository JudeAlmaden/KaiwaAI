import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { FlashcardStatus } from "@/generated/prisma/client";

type Target = "vocab" | "kanji";
type Action = "resetSrs" | "deleteAll";

interface Body {
  target?: Target;
  action?: Action;
}

async function resetVocabSrs(userId: string) {
  const { count } = await prisma.userFlashcard.updateMany({
    where: { userId },
    data: {
      status: FlashcardStatus.new,
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      timesReviewed: 0,
      exposures: 0,
      nextReview: new Date(),
      lastReviewedAt: null,
    },
  });
  return count;
}

async function deleteAllVocab(userId: string) {
  const { count } = await prisma.userFlashcard.deleteMany({
    where: { userId },
  });
  return count;
}

async function resetKanjiSrs(userId: string) {
  const { count } = await prisma.userKanji.updateMany({
    where: { userId },
    data: {
      status: "new",
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      timesReviewed: 0,
      nextReview: new Date(),
      lastReviewedAt: null,
    },
  });
  return count;
}

async function deleteAllKanji(userId: string) {
  const { count } = await prisma.userKanji.deleteMany({
    where: { userId },
  });
  return count;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { target, action } = body;

  if (target !== "vocab" && target !== "kanji") {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }
  if (action !== "resetSrs" && action !== "deleteAll") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  let count: number;
  try {
    if (target === "vocab") {
      count = action === "resetSrs" ? await resetVocabSrs(user.id) : await deleteAllVocab(user.id);
    } else {
      count = action === "resetSrs" ? await resetKanjiSrs(user.id) : await deleteAllKanji(user.id);
    }
  } catch (err) {
    console.error("[learning/reset] Failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, count, target, action });
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const target = url.searchParams.get("target") as Target | null;

  if (target && target !== "vocab" && target !== "kanji") {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  const vocabPromise = prisma.userFlashcard.aggregate({
    where: { userId: user.id },
    _count: true,
  });
  const kanjiPromise = prisma.userKanji.aggregate({
    where: { userId: user.id },
    _count: true,
  });

  const [vocabStats, kanjiStats] = await Promise.all([vocabPromise, kanjiPromise]);

  return NextResponse.json({
    vocab: { total: vocabStats._count },
    kanji: { total: kanjiStats._count },
  });
}
