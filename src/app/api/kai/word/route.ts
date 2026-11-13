import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { dayKeyFor } from "@/lib/day";
import { pickDailyWord, type DailyWord } from "@/lib/kai-word";

function firstGloss(raw: string | null | undefined): string {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && typeof parsed[0] === "string") return parsed[0];
    return "";
  } catch {
    return raw;
  }
}

// One word from the learner's own deck, rotated per day.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const include = { word: true, wordForm: true, phrase: true } as const;

  // Prefer cards still being learned; fall back to the whole deck for people
  // who have marked everything known.
  let cards = await prisma.userFlashcard.findMany({
    where: { userId: user.id, status: { in: ["learning", "new"] } },
    include,
    orderBy: { nextReview: "asc" },
    take: 60,
  });

  if (cards.length === 0) {
    cards = await prisma.userFlashcard.findMany({
      where: { userId: user.id },
      include,
      orderBy: { createdAt: "desc" },
      take: 60,
    });
  }

  const candidates: DailyWord[] = [];
  for (const card of cards) {
    if (card.phrase) {
      candidates.push({
        id: card.id,
        surface: card.phrase.text,
        reading: card.phrase.reading,
        meaning: firstGloss(card.phrase.meanings),
      });
    } else if (card.word) {
      candidates.push({
        id: card.id,
        surface: card.wordForm?.form || card.word.dictionary,
        reading: card.wordForm?.reading || card.word.reading,
        meaning: firstGloss(card.word.meanings),
      });
    }
  }

  const today = dayKeyFor(new Date(), user.timezone);

  return NextResponse.json({
    word: pickDailyWord(candidates, `${today}:${user.id}`),
    dayKey: today,
  });
}
